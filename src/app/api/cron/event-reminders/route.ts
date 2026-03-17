import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  eventRegistrations,
  events,
  privacySettings,
  users,
} from "@/lib/db/schema";
import { sendEventReminderEmail } from "@/lib/email/resend";
import { buildGoogleCalendarUrl, getEventCalendarLocation } from "@/lib/events-calendar";

function getDateLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-UG", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function getTimeLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-UG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const reminderWindowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.bickosa.org").replace(/\/$/, "");

  const dueReminders = await db
    .select({
      registrationId: eventRegistrations.id,
      eventId: events.id,
      userId: users.id,
      userEmail: users.email,
      firstName: alumniProfiles.firstName,
      eventTitle: events.title,
      eventSlug: events.slug,
      eventStartAt: events.startAt,
      eventEndAt: events.endAt,
      eventTimezone: events.timezone,
      eventLocationName: events.locationName,
      eventLocationAddress: events.locationAddress,
      eventIsOnline: events.isOnline,
      eventOnlineUrl: events.onlineUrl,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .innerJoin(users, eq(users.id, eventRegistrations.userId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
    .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
    .where(
      and(
        eq(eventRegistrations.status, "attending"),
        isNull(eventRegistrations.remindedAt),
        eq(events.isPublished, true),
        gt(events.startAt, now),
        lte(events.startAt, reminderWindowEnd),
        or(eq(privacySettings.receiveEventReminders, true), isNull(privacySettings.userId)),
      ),
    );

  let sentCount = 0;
  let failedCount = 0;

  for (const reminder of dueReminders) {
    try {
      const eventLocation = getEventCalendarLocation({
        locationName: reminder.eventLocationName,
        locationAddress: reminder.eventLocationAddress,
        isOnline: reminder.eventIsOnline,
        onlineUrl: reminder.eventOnlineUrl,
      });

      const eventDetailsUrl = `${appUrl}/events/${reminder.eventSlug}`;
      const googleCalendarUrl = buildGoogleCalendarUrl({
        title: reminder.eventTitle,
        startAt: reminder.eventStartAt,
        endAt: reminder.eventEndAt,
        description: null,
        location: eventLocation,
      });

      await sendEventReminderEmail({
        to: reminder.userEmail,
        firstName: reminder.firstName ?? "Member",
        eventTitle: reminder.eventTitle,
        eventDate: getDateLabel(reminder.eventStartAt, reminder.eventTimezone),
        eventTime: getTimeLabel(reminder.eventStartAt, reminder.eventTimezone),
        eventLocation: eventLocation ?? "Location TBA",
        eventDetailsUrl,
        googleCalendarUrl,
        appleCalendarUrl: eventDetailsUrl,
      });

      await db
        .update(eventRegistrations)
        .set({
          remindedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(eventRegistrations.id, reminder.registrationId));

      sentCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    totalDue: dueReminders.length,
    sentCount,
    failedCount,
    reminderWindowHours: 48,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
