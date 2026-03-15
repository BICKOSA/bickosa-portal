import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import {
  getViewerIsVerified,
  listDirectoryAlumni,
  normalizeDirectoryQuery,
} from "@/lib/directory";
import { checkRateLimit } from "@/lib/rate-limit";

const DIRECTORY_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60_000,
} as const;

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`directory:${session.user.id}`, DIRECTORY_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const url = new URL(request.url);
  const query = normalizeDirectoryQuery(url.searchParams);
  const viewerIsVerified = await getViewerIsVerified(session.user.id, Boolean(session.user.emailVerified));
  const { alumni, total } = await listDirectoryAlumni({
    viewerIsVerified,
    query,
  });

  return NextResponse.json({
    data: alumni,
    total,
    page: query.page,
    limit: query.limit,
  });
}
