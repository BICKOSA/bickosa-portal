import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { findDuplicateProfileMatches } from "@/lib/alumni-growth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return (
      authResult.error ??
      NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    );
  }

  try {
    const { id } = await context.params;
    const rows = await findDuplicateProfileMatches(id);
    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to load possible duplicates.",
      },
      { status: 400 },
    );
  }
}
