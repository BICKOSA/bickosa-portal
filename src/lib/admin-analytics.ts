import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  donations,
  eventRegistrations,
  portalAnalyticsEvents,
  sessions,
  users,
} from "@/lib/db/schema";

type FunnelStep = {
  label: string;
  value: number;
};

export type AdminAnalyticsData = {
  membersFunnel: FunnelStep[];
  eventConversionFunnel: FunnelStep[];
  donationFunnel: FunnelStep[];
  northStarKpis: {
    verifiedMembersPercent: number;
    mam: number;
    eventConversionRate: number;
    fundraisingConversionRate: number;
  };
};

const DAYS_30_IN_MS = 30 * 24 * 60 * 60 * 1000;

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function mapEventCounts(
  rows: Array<{ eventName: string; count: number }>,
): Record<string, number> {
  const mapped: Record<string, number> = {};
  for (const row of rows) {
    mapped[row.eventName] = row.count;
  }
  return mapped;
}

export async function getAdminAnalyticsData(): Promise<AdminAnalyticsData> {
  const now = new Date();
  const since30Days = new Date(now.getTime() - DAYS_30_IN_MS);

  const [
    registeredMembersRows,
    emailVerifiedRows,
    profileCompletedRows,
    adminVerifiedRows,
    analyticsEventRows,
    rsvpsRows,
    completedDonationsRows,
    activeMembersRows,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.emailVerified, true)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(alumniProfiles)
      .where(
        and(
          sql`${alumniProfiles.firstName} <> ''`,
          sql`${alumniProfiles.lastName} <> ''`,
          sql`${alumniProfiles.yearOfEntry} is not null`,
          sql`${alumniProfiles.yearOfCompletion} is not null`,
          sql`${alumniProfiles.currentJobTitle} is not null`,
          sql`${alumniProfiles.currentEmployer} is not null`,
          sql`${alumniProfiles.industry} is not null`,
          sql`${alumniProfiles.locationCountry} is not null`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(alumniProfiles)
      .where(eq(alumniProfiles.verificationStatus, "verified")),
    db
      .select({
        eventName: portalAnalyticsEvents.eventName,
        count: sql<number>`count(*)::int`,
      })
      .from(portalAnalyticsEvents)
      .where(
        and(
          gte(portalAnalyticsEvents.createdAt, since30Days),
          inArray(portalAnalyticsEvents.eventName, [
            "event_page_viewed",
            "donation_modal_opened",
            "donation_amount_selected",
          ]),
        ),
      )
      .groupBy(portalAnalyticsEvents.eventName)
      .orderBy(desc(portalAnalyticsEvents.eventName)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.status, "attending"), gte(eventRegistrations.createdAt, since30Days))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(donations)
      .where(and(eq(donations.paymentStatus, "completed"), gte(donations.createdAt, since30Days))),
    db
      .select({ count: sql<number>`count(distinct ${sessions.userId})::int` })
      .from(sessions)
      .where(gte(sessions.createdAt, since30Days)),
  ]);

  const registeredMembers = registeredMembersRows[0]?.count ?? 0;
  const emailVerified = emailVerifiedRows[0]?.count ?? 0;
  const profileCompleted = profileCompletedRows[0]?.count ?? 0;
  const adminVerified = adminVerifiedRows[0]?.count ?? 0;

  const rsvps = rsvpsRows[0]?.count ?? 0;
  const attendedEstimated = Math.round(rsvps * 0.72);
  const completedDonations = completedDonationsRows[0]?.count ?? 0;
  const mam = activeMembersRows[0]?.count ?? 0;
  const eventCounts = mapEventCounts(analyticsEventRows);

  const eventPageViews = eventCounts.event_page_viewed ?? 0;
  const donationModalOpened = eventCounts.donation_modal_opened ?? 0;
  const donationAmountSelected = eventCounts.donation_amount_selected ?? 0;

  return {
    membersFunnel: [
      { label: "Registered", value: registeredMembers },
      { label: "Email Verified", value: emailVerified },
      { label: "Profile Completed", value: profileCompleted },
      { label: "Admin Verified", value: adminVerified },
    ],
    eventConversionFunnel: [
      { label: "Page Views", value: eventPageViews },
      { label: "RSVPs", value: rsvps },
      { label: "Attended (Est.)", value: attendedEstimated },
    ],
    donationFunnel: [
      { label: "Modal Opened", value: donationModalOpened },
      { label: "Amount Selected", value: donationAmountSelected },
      { label: "Payment Completed", value: completedDonations },
    ],
    northStarKpis: {
      verifiedMembersPercent: toPercent(adminVerified, registeredMembers),
      mam,
      eventConversionRate: toPercent(rsvps, eventPageViews),
      fundraisingConversionRate: toPercent(completedDonations, donationModalOpened),
    },
  };
}
