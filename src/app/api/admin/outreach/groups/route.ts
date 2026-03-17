import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { upsertWhatsappGroup } from "@/lib/alumni-growth";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2),
  groupType: z.enum(["cohort", "regional", "sports", "leadership", "general"]),
  cohortId: z.string().uuid().optional().nullable(),
  adminUserId: z.string().uuid().optional().nullable(),
  adminName: z.string().trim().max(255).optional(),
  adminPhone: z.string().trim().max(32).optional(),
  memberCount: z.number().int().min(0).optional().nullable(),
  inviteLink: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return (
      authResult.error ??
      NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    );
  }

  try {
    const payload = schema.parse(await request.json().catch(() => ({})));
    await upsertWhatsappGroup({
      id: payload.id,
      name: payload.name,
      groupType: payload.groupType,
      cohortId: payload.cohortId,
      adminUserId: payload.adminUserId,
      adminName: payload.adminName,
      adminPhone: payload.adminPhone,
      memberCount: payload.memberCount,
      inviteLink: payload.inviteLink,
      notes: payload.notes,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not save WhatsApp group.",
      },
      { status: 400 },
    );
  }
}
