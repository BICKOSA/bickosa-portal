import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { eventRegistrations } from "@/lib/db/schema";
import { buildGoogleCalendarUrl, getEventCalendarLocation } from "@/lib/events-calendar";
import { getEventsByIdsForReminder, getUserBasicProfile } from "@/lib/events";
import { sendEventReminderEmail } from "@/lib/email/resend";

type ReminderPayload = {
  eventId?: string;
  userId?: string;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  hour: "2-digit",
  minute: "2-digit",
});

export async function POST(request: Request) {
  const secret = process.env.EVENT_REMINDER_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "Reminder secret is not configured." }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-reminder-secret");
  if (!providedSecret || providedSecret !== secret) {
    return NextResponse.json({ message: "Unauthorized reminder request." }, { status: 401 });
  }

  const body = (await request.json()) as ReminderPayload;
  const eventId = body.eventId?.trim();
  const userId = body.userId?.trim();

  if (!eventId || !userId) {
    return NextResponse.json({ message: "Missing eventId or userId." }, { status: 400 });
  }

  const registration = await db.query.eventRegistrations.findFirst({
    where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)),
    columns: {
      status: true,
    },
  });

  if (!registration || registration.status !== "attending") {
    return NextResponse.json({ message: "User is not currently attending this event." }, { status: 200 });
  }

  const [event] = await getEventsByIdsForReminder([eventId]);
  if (!event) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  const profile = await getUserBasicProfile(userId);
  if (!profile) {
    return NextResponse.json({ message: "User profile not found." }, { status: 404 });
  }

  if (!profile.receiveEventReminders) {
    return NextResponse.json({ message: "User has disabled event reminders." }, { status: 200 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.bickosa.org";
  const eventDetailsUrl = `${appUrl.replace(/\/$/, "")}/portal/events/${event.slug}`;
  const location = getEventCalendarLocation(event);

  const googleCalendarUrl = buildGoogleCalendarUrl({
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    description: null,
    location,
  });

  await sendEventReminderEmail({
    to: profile.email,
    firstName: profile.firstName,
    eventTitle: event.title,
    eventDate: DATE_FORMATTER.format(event.startAt),
    eventTime: TIME_FORMATTER.format(event.startAt),
    eventLocation: location ?? "Location TBA",
    eventDetailsUrl,
    googleCalendarUrl,
    appleCalendarUrl: eventDetailsUrl,
  });

  return NextResponse.json({ ok: true });
}
