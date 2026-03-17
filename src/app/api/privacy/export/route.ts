import { eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  campaigns,
  consentLogs,
  donations,
  eventRegistrations,
  events,
  mentorshipRequests,
  privacySettings,
} from "@/lib/db/schema";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const userId = session.user.id;

  const [
    alumniProfile,
    privacy,
    consentLogRows,
    eventRegistrationRows,
    donationRows,
    mentorshipRows,
  ] = await Promise.all([
    db.query.alumniProfiles.findFirst({
      where: eq(alumniProfiles.userId, userId),
    }),
    db.query.privacySettings.findFirst({
      where: eq(privacySettings.userId, userId),
    }),
    db.query.consentLogs.findMany({
      where: eq(consentLogs.userId, userId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    }),
    db
      .select({
        status: eventRegistrations.status,
        createdAt: eventRegistrations.createdAt,
        updatedAt: eventRegistrations.updatedAt,
        ticketRef: eventRegistrations.ticketRef,
        eventTitle: events.title,
      })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .where(eq(eventRegistrations.userId, userId)),
    db
      .select({
        id: donations.id,
        amount: donations.amount,
        currency: donations.currency,
        paymentMethod: donations.paymentMethod,
        paymentStatus: donations.paymentStatus,
        isAnonymous: donations.isAnonymous,
        donorName: donations.donorName,
        createdAt: donations.createdAt,
        campaignTitle: campaigns.title,
      })
      .from(donations)
      .innerJoin(campaigns, eq(campaigns.id, donations.campaignId))
      .where(eq(donations.userId, userId)),
    db.query.mentorshipRequests.findMany({
      where: or(eq(mentorshipRequests.mentorId, userId), eq(mentorshipRequests.menteeId, userId)),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    data: {
      alumni_profile: alumniProfile,
      privacy_settings: privacy,
      consent_logs: consentLogRows,
      event_registrations: eventRegistrationRows,
      donations: donationRows,
      mentorship_requests: mentorshipRows,
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="bickosa-data-export.json"',
      "cache-control": "no-store",
    },
  });
}
