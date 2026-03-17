import { z } from "zod";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { portalAnalyticsEvents } from "@/lib/analytics/events";
import { trackPortalEvent } from "@/lib/analytics/server";

const trackSchema = z.object({
  event: z.enum(portalAnalyticsEvents),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = trackSchema.parse(await request.json());
    await trackPortalEvent({
      event: payload.event,
      userId: session.user.id,
      properties: payload.properties,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid analytics payload." }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to track analytics event." }, { status: 500 });
  }
}
