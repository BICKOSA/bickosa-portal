import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { verifyRegistrationAndCreateAccount } from "@/lib/alumni-growth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const schema = z.object({
  verificationNotes: z.string().trim().max(2000).optional(),
  schoolRecordMatch: z.boolean(),
});

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return (
      authResult.error ??
      NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    );
  }

  try {
    const payload = schema.parse(await request.json().catch(() => ({})));
    const { id } = await context.params;
    await verifyRegistrationAndCreateAccount({
      registrationId: id,
      adminUserId: authResult.session.user.id,
      verificationNotes: payload.verificationNotes,
      schoolRecordMatch: payload.schoolRecordMatch,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Verification failed.",
      },
      { status: 400 },
    );
  }
}
