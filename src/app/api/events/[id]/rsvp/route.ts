import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { trackPortalEvent } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { alumniProfiles, eventRegistrations } from "@/lib/db/schema";
import { getEventForRsvpValidation } from "@/lib/events";
import { createNotification } from "@/lib/notifications/create-notification";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getViewerIsVerified(userId: string, emailVerified: boolean): Promise<boolean> {
  if (emailVerified) {
    return true;
  }

  const profile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, userId),
    columns: {
      verificationStatus: true,
    },
  });

  return profile?.verificationStatus === "verified";
}

async function scheduleReminderForRsvp(params: {
  eventId: string;
  userId: string;
  eventStartAt: Date;
}) {
  const qstashUrl = process.env.QSTASH_URL;
  const qstashToken = process.env.QSTASH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const reminderSecret = process.env.EVENT_REMINDER_SECRET;

  if (!qstashUrl || !qstashToken || !appUrl || !reminderSecret) {
    return;
  }

  const reminderAt = params.eventStartAt.getTime() - 48 * 60 * 60 * 1000;
  const delaySeconds = Math.floor((reminderAt - Date.now()) / 1000);

  if (delaySeconds <= 0) {
    return;
  }

  const targetUrl = `${appUrl.replace(/\/$/, "")}/api/events/reminder`;
  const publishUrl = `${qstashUrl.replace(/\/$/, "")}/v2/publish/${encodeURIComponent(targetUrl)}`;

  const response = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qstashToken}`,
      "Content-Type": "application/json",
      "Upstash-Delay": `${delaySeconds}s`,
      "Upstash-Method": "POST",
      "Upstash-Header-x-reminder-secret": reminderSecret,
    },
    body: JSON.stringify({
      eventId: params.eventId,
      userId: params.userId,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Failed to schedule reminder: ${payload}`);
  }
}

function isPastOrClosed(event: {
  startAt: Date;
  endAt: Date | null;
  rsvpDeadline: Date | null;
}) {
  const now = Date.now();
  if ((event.endAt ?? event.startAt).getTime() < now) {
    return { passed: true, deadlinePassed: false };
  }
  if (event.rsvpDeadline && event.rsvpDeadline.getTime() < now) {
    return { passed: false, deadlinePassed: true };
  }
  return { passed: false, deadlinePassed: false };
}

async function getAttendeeCount(eventId: string): Promise<number> {
  const rows = await db.query.eventRegistrations.findMany({
    where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "attending")),
    columns: { id: true },
  });

  return rows.length;
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isVerified = await getViewerIsVerified(session.user.id, Boolean(session.user.emailVerified));
  if (!isVerified) {
    return NextResponse.json(
      { message: "Your account must be verified before RSVP." },
      { status: 403 },
    );
  }

  const { id: eventId } = await context.params;
  const { event, attendeeCount } = await getEventForRsvpValidation(eventId);

  if (!event || !event.isPublished) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  const state = isPastOrClosed(event);
  if (state.passed) {
    return NextResponse.json({ message: "This event has already passed." }, { status: 409 });
  }
  if (state.deadlinePassed) {
    return NextResponse.json({ message: "RSVP deadline has passed." }, { status: 409 });
  }
  if (event.maxAttendees && attendeeCount >= event.maxAttendees) {
    return NextResponse.json({ message: "This event is sold out." }, { status: 409 });
  }

  const existingRegistration = await db.query.eventRegistrations.findFirst({
    where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.user.id)),
    columns: {
      status: true,
    },
  });
  const wasAlreadyAttending = existingRegistration?.status === "attending";

  await db
    .insert(eventRegistrations)
    .values({
      eventId,
      userId: session.user.id,
      status: "attending",
    })
    .onConflictDoUpdate({
      target: [eventRegistrations.eventId, eventRegistrations.userId],
      set: {
        status: "attending",
        updatedAt: new Date(),
      },
    });

  if (!wasAlreadyAttending) {
    await trackPortalEvent({
      event: "event_rsvp",
      userId: session.user.id,
      properties: {
        event_type: event.type,
        event_id: event.id,
        is_paid: event.ticketPrice > 0,
      },
    });

    await createNotification({
      userId: session.user.id,
      type: "rsvp_confirmed",
      title: `RSVP confirmed for ${event.title}`,
      body: `You are confirmed for ${event.title}. We look forward to seeing you there.`,
      actionUrl: `/events/${event.slug}`,
      idempotencyKey: `rsvp_confirmed:${eventId}:${session.user.id}`,
    });

    try {
      await scheduleReminderForRsvp({
        eventId,
        userId: session.user.id,
        eventStartAt: event.startAt,
      });
    } catch (error) {
      console.error("Failed to schedule event reminder job", error);
    }
  }

  const updatedCount = await getAttendeeCount(eventId);
  return NextResponse.json({
    status: "attending",
    attendeeCount: updatedCount,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const isVerified = await getViewerIsVerified(session.user.id, Boolean(session.user.emailVerified));
  if (!isVerified) {
    return NextResponse.json(
      { message: "Your account must be verified before changing RSVP." },
      { status: 403 },
    );
  }

  const { id: eventId } = await context.params;
  const { event } = await getEventForRsvpValidation(eventId);
  if (!event || !event.isPublished) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  await db
    .update(eventRegistrations)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.user.id)));

  await trackPortalEvent({
    event: "event_rsvp_cancelled",
    userId: session.user.id,
    properties: {
      event_id: event.id,
    },
  });

  const updatedCount = await getAttendeeCount(eventId);
  return NextResponse.json({
    status: "cancelled",
    attendeeCount: updatedCount,
  });
}
