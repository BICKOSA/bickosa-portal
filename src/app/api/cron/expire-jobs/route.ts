import { and, eq, isNotNull, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const result = await db
    .update(jobPostings)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(jobPostings.isActive, true), isNotNull(jobPostings.expiresAt), lt(jobPostings.expiresAt, new Date())));

  return NextResponse.json({
    ok: true,
    expiredCount: result.rowCount ?? 0,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
