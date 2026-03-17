import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  isCampaignSlugAvailable,
  listAdminCampaigns,
  maybeUploadCampaignBanner,
  normalizeAdminCampaignListQuery,
  parseCampaignFormInput,
} from "@/lib/admin-campaigns";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import {
  createNotificationsForUsers,
  listNotificationRecipientUserIdsByPreference,
} from "@/lib/notifications/create-notification";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const url = new URL(request.url);
  const query = normalizeAdminCampaignListQuery(url.searchParams);
  const data = await listAdminCampaigns(query);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const input = parseCampaignFormInput(formData);
    const slugAvailable = await isCampaignSlugAvailable({
      slug: input.slug,
    });
    if (!slugAvailable) {
      return NextResponse.json(
        { message: "A campaign with this slug already exists." },
        { status: 409 },
      );
    }

    const bannerFile = formData.get("bannerImage");
    const bannerKey = await maybeUploadCampaignBanner({
      file: bannerFile instanceof File ? bannerFile : null,
      userId: authResult.session.user.id,
    });

    const [created] = await db
      .insert(campaigns)
      .values({
        title: input.title,
        slug: input.slug,
        description: input.description,
        projectType: input.projectType,
        goalAmount: input.goalAmount,
        currency: input.currency,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive,
        bannerKey,
        bannerColor: input.bannerColor,
        isFeatured: input.isFeatured,
        isPublished: input.isPublished,
      })
      .returning({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        isPublished: campaigns.isPublished,
      });

    if (created.isPublished) {
      const recipients = await listNotificationRecipientUserIdsByPreference({
        preference: "receiveDonationCampaignUpdates",
      });
      await createNotificationsForUsers({
        userIds: recipients,
        type: "new_campaign",
        title: `New fundraising campaign: ${created.title}`,
        body: `${created.title} is now live. Explore the campaign and support the cause.`,
        actionUrl: `/donate/${created.slug}`,
        idempotencyKeyPrefix: `new_campaign:${created.id}`,
      });
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Failed to create campaign." }, { status: 500 });
  }
}
