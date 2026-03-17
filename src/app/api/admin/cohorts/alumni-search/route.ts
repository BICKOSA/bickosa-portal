import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { searchVerifiedAlumniForReps } from "@/lib/alumni-growth";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error || !authResult.session) {
    return (
      authResult.error ??
      NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    );
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? "";
  const rows = await searchVerifiedAlumniForReps(query);
  return NextResponse.json({ rows }, { status: 200 });
}
