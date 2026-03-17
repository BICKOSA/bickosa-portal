import { NextResponse } from "next/server";

import { expireDueJobPostings } from "@/lib/careers";

function isCronAuthorized(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return true;
  }

  const headerValue = request.headers.get("authorization");
  if (!headerValue) {
    return false;
  }

  return headerValue === `Bearer ${configuredSecret}`;
}

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
