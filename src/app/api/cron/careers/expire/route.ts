import { NextResponse } from "next/server";

import { expireDueJobPostings } from "@/lib/careers";
import { isCronAuthorized } from "@/lib/cron-auth";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const result = await expireDueJobPostings();
  return NextResponse.json({
    ok: true,
    expiredCount: result.affected,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
