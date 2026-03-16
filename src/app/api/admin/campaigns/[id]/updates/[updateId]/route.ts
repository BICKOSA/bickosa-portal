import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  campaignUpdateInputSchema,
  deleteCampaignUpdate,
  updateCampaignUpdate,
} from "@/lib/admin-campaign-updates";

type RouteContext = {
  params: Promise<{ id: string; updateId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id, updateId } = await context.params;

  try {
    const payload = campaignUpdateInputSchema.parse(await request.json());
    const updated = await updateCampaignUpdate({
      campaignId: id,
      updateId,
      input: payload,
    });

    if (!updated) {
      return NextResponse.json({ message: "Update not found." }, { status: 404 });
    }

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Failed to update campaign update." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id, updateId } = await context.params;
  const deleted = await deleteCampaignUpdate({
    campaignId: id,
    updateId,
  });

  if (!deleted) {
    return NextResponse.json({ message: "Update not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
