import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { verifyRegistrationsBulk } from "@/lib/alumni-growth";

const schema = z.object({
  registrationIds: z.array(z.string().uuid()).min(1, "Select at least one row."),
  verificationNotes: z.string().trim().max(2000).optional(),
  schoolRecordMatch: z.boolean().default(true),
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
    const result = await verifyRegistrationsBulk({
      registrationIds: payload.registrationIds,
      adminUserId: authResult.session.user.id,
      verificationNotes: payload.verificationNotes,
      schoolRecordMatch: payload.schoolRecordMatch,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Bulk verification failed.",
      },
      { status: 400 },
    );
  }
}
