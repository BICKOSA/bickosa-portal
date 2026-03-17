import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { assignCohortRepresentative } from "@/lib/alumni-growth";

const schema = z.object({
  cohortId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().trim().max(100).optional(),
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
    await assignCohortRepresentative({
      cohortId: payload.cohortId,
      userId: payload.userId,
      appointedBy: authResult.session.user.id,
      role: payload.role ?? "Representative",
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to assign representative.",
      },
      { status: 400 },
    );
  }
}
