import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { setJobPostingModerationDecision } from "@/lib/careers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const approveSchema = z.object({
  decision: z.enum(["approve", "reject"]).default("approve"),
});

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const { decision } = approveSchema.parse(await request.json().catch(() => ({})));
    const { id } = await context.params;

    const updated = await setJobPostingModerationDecision({
      id,
      decision,
    });

    if (!updated) {
      return NextResponse.json({ message: "Job posting not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      isApproved: updated.isApproved,
      isActive: updated.isActive,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to moderate job posting.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
