import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { verifyMemberProfileAction } from "@/lib/admin-members";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const verifyMemberSchema = z
  .object({
    action: z.enum(["approve", "reject", "suspend"]),
    notes: z.string().trim().max(2000).optional(),
    chapterId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "reject" && !value.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rejection reason is required.",
        path: ["notes"],
      });
    }
  });

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return authResult.error ?? NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = verifyMemberSchema.parse(await request.json().catch(() => ({})));
    const { id } = await context.params;

    const result = await verifyMemberProfileAction({
      profileId: id,
      adminUserId: authResult.session.user.id,
      action: payload.action,
      notes: payload.notes,
      chapterId: payload.chapterId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify member.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
