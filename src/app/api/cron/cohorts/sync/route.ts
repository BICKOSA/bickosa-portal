import { NextResponse } from "next/server";

import { ensureCohortsFromProfiles } from "@/lib/alumni-growth";
import { isCronAuthorized } from "@/lib/cron-auth";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { message: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  await ensureCohortsFromProfiles();
  return NextResponse.json({ ok: true }, { status: 200 });
}
