import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { markGroupOutreachSent } from "@/lib/alumni-growth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return (
      authResult.error ??
      NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    );
  }

  try {
    const { id } = await context.params;
    await markGroupOutreachSent(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to update outreach status.",
      },
      { status: 400 },
    );
  }
}
