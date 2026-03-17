"use client";

import type { PortalAnalyticsEventName, PortalAnalyticsProperties } from "@/lib/analytics/events";

export async function trackPortalEventClient(input: {
  event: PortalAnalyticsEventName;
  properties?: PortalAnalyticsProperties;
}): Promise<void> {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Analytics should never block the user flow.
  }
}
