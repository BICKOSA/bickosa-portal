import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { verifyMemberProfilesBulk } from "@/lib/admin-members";

const verifyBulkSchema = z
  .object({
    profileIds: z.array(z.string().uuid()).min(1, "Select at least one member."),
    action: z.enum(["approve", "reject"]),
    notes: z.string().trim().max(2000).optional(),
    chapterId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "reject" && !value.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rejection reason is required for bulk reject.",
        path: ["notes"],
      });
    }
  });

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = verifyBulkSchema.parse(await request.json().catch(() => ({})));
    const result = await verifyMemberProfilesBulk({
      profileIds: payload.profileIds,
      adminUserId: authResult.session.user.id,
      action: payload.action,
      notes: payload.notes,
      chapterId: payload.chapterId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk verification failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
