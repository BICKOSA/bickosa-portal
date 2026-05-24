import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { setUserRole } from "@/lib/admin-members";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateRoleSchema = z.object({
  role: z.enum(["member", "admin"]),
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
    const { id } = await context.params;
    const payload = updateRoleSchema.parse(await request.json().catch(() => ({})));
    const result = await setUserRole({
      targetUserId: id,
      actorUserId: authResult.session.user.id,
      nextRole: payload.role,
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update role.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
