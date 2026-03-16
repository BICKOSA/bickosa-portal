import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  getAdminCampaignById,
  isCampaignSlugAvailable,
  maybeUploadCampaignBanner,
  parseCampaignFormInput,
} from "@/lib/admin-campaigns";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchJsonSchema = z.object({
  isPublished: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getAdminCampaignById(id);
  if (!existing) {
    return NextResponse.json({ message: "Campaign not found." }, { status: 404 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = patchJsonSchema.parse(await request.json());
      await db
        .update(campaigns)
        .set({
          isPublished: payload.isPublished ?? existing.isPublished,
          isActive: payload.isActive ?? existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id));
      return NextResponse.json({ id });
    }

    const formData = await request.formData();
    const input = parseCampaignFormInput(formData);

    const slugAvailable = await isCampaignSlugAvailable({
      slug: input.slug,
      excludeId: id,
    });
    if (!slugAvailable) {
      return NextResponse.json(
        { message: "A campaign with this slug already exists." },
        { status: 409 },
      );
    }

    const bannerFile = formData.get("bannerImage");
    const uploadedBannerKey = await maybeUploadCampaignBanner({
      file: bannerFile instanceof File ? bannerFile : null,
      userId: authResult.session.user.id,
    });

    await db
      .update(campaigns)
      .set({
        title: input.title,
        slug: input.slug,
        description: input.description,
        projectType: input.projectType,
        goalAmount: input.goalAmount,
        currency: input.currency,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive,
        bannerKey: uploadedBannerKey ?? existing.bannerKey,
        bannerColor: input.bannerColor,
        isFeatured: input.isFeatured,
        isPublished: input.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));

    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Failed to update campaign." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await context.params;
  const existing = await getAdminCampaignById(id);
  if (!existing) {
    return NextResponse.json({ message: "Campaign not found." }, { status: 404 });
  }

  await db.delete(campaigns).where(eq(campaigns.id, id));
  return NextResponse.json({ ok: true });
}
