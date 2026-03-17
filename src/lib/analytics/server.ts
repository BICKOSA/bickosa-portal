import { PostHog } from "posthog-node";

import { db } from "@/lib/db";
import { portalAnalyticsEvents } from "@/lib/db/schema";

import type { PortalAnalyticsEventName, PortalAnalyticsProperties } from "./events";

type TrackPortalEventInput = {
  event: PortalAnalyticsEventName;
  userId?: string | null;
  properties?: PortalAnalyticsProperties;
};

const posthogKey = process.env.POSTHOG_KEY;
const posthogHost = process.env.POSTHOG_HOST ?? "https://app.posthog.com";

const posthog = posthogKey ? new PostHog(posthogKey, { host: posthogHost }) : null;

function normalizeProperties(
  properties: PortalAnalyticsProperties | undefined,
): Record<string, string | number | boolean | null> {
  if (!properties) {
    return {};
  }

  const normalized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      normalized[key] = value;
    }
  }
  return normalized;
}

export async function trackPortalEvent(input: TrackPortalEventInput): Promise<void> {
  const properties = normalizeProperties(input.properties);

  try {
    await db.insert(portalAnalyticsEvents).values({
      eventName: input.event,
      userId: input.userId ?? null,
      properties,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to persist analytics event", error);
  }

  if (!posthog) {
    return;
  }

  try {
    await posthog.capture({
      distinctId: input.userId ?? `anonymous_${crypto.randomUUID()}`,
      event: input.event,
      properties,
    });
  } catch (error) {
    console.error("Failed to send analytics event to PostHog", error);
  }
}
