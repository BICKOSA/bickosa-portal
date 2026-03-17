import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  campaigns,
  chapters,
  donations,
  events,
  jobPostings,
  mentorshipRequests,
  users,
} from "@/lib/db/schema";

export type AdminOverviewStats = {
  totalRegisteredMembers: number;
  verifiedMembers: number;
  pendingVerification: number;
  newRegistrationsThisMonth: number;
  totalDonationsRaised: number;
  activeCampaigns: number;
  eventsThisMonth: number;
  activeMentorshipPairings: number;
  pendingJobPostings: number;
};

export type MonthlySeriesPoint = {
  monthKey: string;
  monthLabel: string;
  value: number;
};

export type ChapterDistributionPoint = {
  chapter: string;
  members: number;
};

export type AdminOverviewData = {
  stats: AdminOverviewStats;
  membersJoinedSeries: MonthlySeriesPoint[];
  donationsByMonthSeries: MonthlySeriesPoint[];
  chapterDistribution: ChapterDistributionPoint[];
};

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(value: Date, months: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + months, 1, 0, 0, 0, 0);
}

function getMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-UG", { month: "short" }).format(date);
}

function getMonthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function buildLastTwelveMonths(): Array<{ monthKey: string; monthLabel: string }> {
  const currentMonth = startOfMonth(new Date());
  const months: Array<{ monthKey: string; monthLabel: string }> = [];

  for (let index = 11; index >= 0; index -= 1) {
    const date = addMonths(currentMonth, -index);
    months.push({
      monthKey: getMonthKey(date),
      monthLabel: getMonthLabel(date),
    });
  }

  return months;
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const months = buildLastTwelveMonths();
  const firstMonthKey = months[0]?.monthKey;

  const [
    membersTotals,
    donationTotals,
    activeCampaignsRows,
    eventsThisMonthRows,
    mentorshipActiveRows,
    pendingJobRows,
    membersJoinedRows,
    donationsByMonthRows,
    chapterDistributionRows,
  ] = await Promise.all([
    db
      .select({
        totalRegisteredMembers: sql<number>`count(*)::int`,
        verifiedMembers:
          sql<number>`count(*) filter (where ${alumniProfiles.verificationStatus} = 'verified')::int`,
        pendingVerification:
          sql<number>`count(*) filter (where ${alumniProfiles.verificationStatus} = 'pending')::int`,
      })
      .from(alumniProfiles),
    db
      .select({
        totalDonationsRaised: sql<number>`coalesce(sum(${donations.amount}) filter (where ${donations.paymentStatus} = 'completed'), 0)::numeric`,
      })
      .from(donations),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(eq(campaigns.isActive, true)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(events)
      .where(and(gte(events.startAt, thisMonthStart), lte(events.startAt, thisMonthEnd))),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(mentorshipRequests)
      .where(eq(mentorshipRequests.status, "accepted")),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(jobPostings)
      .where(and(eq(jobPostings.isApproved, false), eq(jobPostings.isActive, true))),
    firstMonthKey
      ? db
          .select({
            monthKey: sql<string>`to_char(date_trunc('month', ${users.createdAt}), 'YYYY-MM')`,
            value: sql<number>`count(*)::int`,
          })
          .from(users)
          .where(
            and(
              eq(users.role, "member"),
              gte(users.createdAt, addMonths(thisMonthStart, -11)),
              lte(users.createdAt, thisMonthEnd),
            ),
          )
          .groupBy(sql`date_trunc('month', ${users.createdAt})`)
      : Promise.resolve([]),
    firstMonthKey
      ? db
          .select({
            monthKey: sql<string>`to_char(date_trunc('month', ${donations.createdAt}), 'YYYY-MM')`,
            value: sql<number>`coalesce(sum(${donations.amount}), 0)::numeric`,
          })
          .from(donations)
          .where(
            and(
              eq(donations.paymentStatus, "completed"),
              gte(donations.createdAt, addMonths(thisMonthStart, -11)),
              lte(donations.createdAt, thisMonthEnd),
            ),
          )
          .groupBy(sql`date_trunc('month', ${donations.createdAt})`)
      : Promise.resolve([]),
    db
      .select({
        chapter: sql<string>`coalesce(${chapters.name}, 'Unassigned')`,
        members: sql<number>`count(*)::int`,
      })
      .from(alumniProfiles)
      .leftJoin(chapters, eq(chapters.id, alumniProfiles.chapterId))
      .groupBy(sql`coalesce(${chapters.name}, 'Unassigned')`)
      .orderBy(sql`count(*) desc`)
      .limit(12),
  ]);

  const membersJoinedLookup = new Map(membersJoinedRows.map((row) => [row.monthKey, row.value]));
  const donationsByMonthLookup = new Map(donationsByMonthRows.map((row) => [row.monthKey, row.value]));

  const stats: AdminOverviewStats = {
    totalRegisteredMembers: membersTotals[0]?.totalRegisteredMembers ?? 0,
    verifiedMembers: membersTotals[0]?.verifiedMembers ?? 0,
    pendingVerification: membersTotals[0]?.pendingVerification ?? 0,
    newRegistrationsThisMonth: await db
      .select({ value: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.role, "member"), gte(users.createdAt, thisMonthStart), lte(users.createdAt, thisMonthEnd)))
      .then((rows) => rows[0]?.value ?? 0),
    totalDonationsRaised: Number(donationTotals[0]?.totalDonationsRaised ?? 0),
    activeCampaigns: activeCampaignsRows[0]?.value ?? 0,
    eventsThisMonth: eventsThisMonthRows[0]?.value ?? 0,
    activeMentorshipPairings: mentorshipActiveRows[0]?.value ?? 0,
    pendingJobPostings: pendingJobRows[0]?.value ?? 0,
  };

  const membersJoinedSeries: MonthlySeriesPoint[] = months.map((month) => ({
    monthKey: month.monthKey,
    monthLabel: month.monthLabel,
    value: membersJoinedLookup.get(month.monthKey) ?? 0,
  }));

  const donationsByMonthSeries: MonthlySeriesPoint[] = months.map((month) => ({
    monthKey: month.monthKey,
    monthLabel: month.monthLabel,
    value: Number(donationsByMonthLookup.get(month.monthKey) ?? 0),
  }));

  const chapterDistribution: ChapterDistributionPoint[] = chapterDistributionRows.map((row) => ({
    chapter: row.chapter,
    members: row.members,
  }));

  return {
    stats,
    membersJoinedSeries,
    donationsByMonthSeries,
    chapterDistribution,
  };
}
