import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  campaignUpdateInputSchema,
  createCampaignUpdate,
  ensureCampaignExists,
  listCampaignUpdatesByCampaignId,
} from "@/lib/admin-campaign-updates";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await context.params;
  const campaignExists = await ensureCampaignExists(id);
  if (!campaignExists) {
    return NextResponse.json({ message: "Campaign not found." }, { status: 404 });
  }

  const updates = await listCampaignUpdatesByCampaignId(id);
  return NextResponse.json({ data: updates });
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const campaignExists = await ensureCampaignExists(id);
  if (!campaignExists) {
    return NextResponse.json({ message: "Campaign not found." }, { status: 404 });
  }

  try {
    const payload = campaignUpdateInputSchema.parse(await request.json());
    const created = await createCampaignUpdate({
      campaignId: id,
      authorId: authResult.session.user.id,
      input: payload,
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Failed to create campaign update." }, { status: 500 });
  }
}
