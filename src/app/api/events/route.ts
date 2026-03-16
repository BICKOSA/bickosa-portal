import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { listEventsForViewer, normalizeEventsQuery } from "@/lib/events";
import { checkRateLimit } from "@/lib/rate-limit";

const EVENTS_RATE_LIMIT = {
  maxRequests: 40,
  windowMs: 60_000,
} as const;

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`events:${session.user.id}`, EVENTS_RATE_LIMIT);
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
  const query = normalizeEventsQuery(url.searchParams);
  const events = await listEventsForViewer({
    userId: session.user.id,
    query,
  });

  return NextResponse.json(events);
}
