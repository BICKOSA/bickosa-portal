import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  campaigns,
  chapters,
  eventRegistrations,
  events,
  mentorshipRequests,
} from "@/lib/db/schema";

export type PortalDashboardStat = {
  value: number;
  comparisonPercent: number | null;
};

export type PortalDashboardActivity = {
  type: "event" | "members" | "mentorship" | "giving";
  text: string;
  time: Date;
};

export type PortalDashboardData = {
  totalMembers: PortalDashboardStat & {
    newThisMonth: number;
    activeChapters: number;
  };
  eventRsvps: PortalDashboardStat & {
    activeEventsThisMonth: number;
  };
  mentorshipMatches: PortalDashboardStat & {
    newThisQuarter: number;
  };
  givingCampaigns: PortalDashboardStat & {
    featuredCampaigns: number;
    topCampaignProgressPercent: number | null;
    topCampaignTitle: string | null;
  };
  recentActivity: PortalDashboardActivity[];
};

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(value: Date, months: number): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth() + months,
    1,
    0,
    0,
    0,
    0,
  );
}

function startOfQuarter(value: Date): Date {
  const quarterStartMonth = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
}

function addQuarters(value: Date, quarters: number): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth() + quarters * 3,
    1,
    0,
    0,
    0,
    0,
  );
}

function comparisonPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function campaignProgressPercent(
  raisedAmount: bigint,
  goalAmount: bigint,
): number | null {
  if (goalAmount <= BigInt(0)) {
    return null;
  }

  return Math.min(
    100,
    Math.round((Number(raisedAmount) / Number(goalAmount)) * 100),
  );
}

export async function getPortalDashboardData(): Promise<PortalDashboardData> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const nextMonthStart = addMonths(thisMonthStart, 1);
  const previousMonthStart = addMonths(thisMonthStart, -1);
  const thisQuarterStart = startOfQuarter(now);
  const nextQuarterStart = addQuarters(thisQuarterStart, 1);
  const previousQuarterStart = addQuarters(thisQuarterStart, -1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const [
    memberTotals,
    memberThisMonthRows,
    memberPreviousMonthRows,
    activeChapterRows,
    rsvpThisMonthRows,
    rsvpPreviousMonthRows,
    activeEventsRows,
    mentorshipTotals,
    mentorshipThisQuarterRows,
    mentorshipPreviousQuarterRows,
    campaignTotals,
    topCampaignRows,
    upcomingEventRows,
    verifiedThisWeekRows,
    latestMentorshipRows,
    latestCampaignRows,
  ] = await Promise.all([
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(alumniProfiles)
      .where(eq(alumniProfiles.verificationStatus, "verified")),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(alumniProfiles)
      .where(
        and(
          eq(alumniProfiles.verificationStatus, "verified"),
          gte(alumniProfiles.createdAt, thisMonthStart),
          lt(alumniProfiles.createdAt, nextMonthStart),
        ),
      ),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(alumniProfiles)
      .where(
        and(
          eq(alumniProfiles.verificationStatus, "verified"),
          gte(alumniProfiles.createdAt, previousMonthStart),
          lt(alumniProfiles.createdAt, thisMonthStart),
        ),
      ),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(chapters)
      .where(eq(chapters.isActive, true)),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(eventRegistrations)
      .where(
        and(
          gte(eventRegistrations.createdAt, thisMonthStart),
          lt(eventRegistrations.createdAt, nextMonthStart),
        ),
      ),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(eventRegistrations)
      .where(
        and(
          gte(eventRegistrations.createdAt, previousMonthStart),
          lt(eventRegistrations.createdAt, thisMonthStart),
        ),
      ),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(events)
      .where(
        and(
          eq(events.isPublished, true),
          gte(events.startAt, thisMonthStart),
          lt(events.startAt, nextMonthStart),
        ),
      ),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(mentorshipRequests)
      .where(eq(mentorshipRequests.status, "accepted")),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(mentorshipRequests)
      .where(
        and(
          eq(mentorshipRequests.status, "accepted"),
          gte(mentorshipRequests.respondedAt, thisQuarterStart),
          lt(mentorshipRequests.respondedAt, nextQuarterStart),
        ),
      ),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(mentorshipRequests)
      .where(
        and(
          eq(mentorshipRequests.status, "accepted"),
          gte(mentorshipRequests.respondedAt, previousQuarterStart),
          lt(mentorshipRequests.respondedAt, thisQuarterStart),
        ),
      ),
    db
      .select({
        activeCampaigns: sql<number>`count(*) filter (where ${campaigns.isActive} = true and ${campaigns.isPublished} = true)::int`,
        featuredCampaigns: sql<number>`count(*) filter (where ${campaigns.isActive} = true and ${campaigns.isPublished} = true and ${campaigns.isFeatured} = true)::int`,
      })
      .from(campaigns),
    db
      .select({
        title: campaigns.title,
        goalAmount: campaigns.goalAmount,
        raisedAmount: campaigns.raisedAmount,
      })
      .from(campaigns)
      .where(and(eq(campaigns.isActive, true), eq(campaigns.isPublished, true)))
      .orderBy(desc(campaigns.raisedAmount), desc(campaigns.createdAt))
      .limit(1),
    db
      .select({
        title: events.title,
        startAt: events.startAt,
      })
      .from(events)
      .where(and(eq(events.isPublished, true), gte(events.startAt, now)))
      .orderBy(events.startAt)
      .limit(1),
    db
      .select({
        value: sql<number>`count(*)::int`,
        latestAt: sql<Date | null>`max(${alumniProfiles.verifiedAt})`,
      })
      .from(alumniProfiles)
      .where(
        and(
          eq(alumniProfiles.verificationStatus, "verified"),
          gte(alumniProfiles.verifiedAt, weekStart),
          lte(alumniProfiles.verifiedAt, now),
        ),
      ),
    db
      .select({
        field: mentorshipRequests.field,
        respondedAt: mentorshipRequests.respondedAt,
      })
      .from(mentorshipRequests)
      .where(eq(mentorshipRequests.status, "accepted"))
      .orderBy(
        desc(mentorshipRequests.respondedAt),
        desc(mentorshipRequests.createdAt),
      )
      .limit(1),
    db
      .select({
        title: campaigns.title,
        goalAmount: campaigns.goalAmount,
        raisedAmount: campaigns.raisedAmount,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .where(and(eq(campaigns.isActive, true), eq(campaigns.isPublished, true)))
      .orderBy(desc(campaigns.updatedAt))
      .limit(1),
  ]);

  const totalMembers = memberTotals[0]?.value ?? 0;
  const newMembersThisMonth = memberThisMonthRows[0]?.value ?? 0;
  const previousMonthMembers = memberPreviousMonthRows[0]?.value ?? 0;
  const eventRsvpsThisMonth = rsvpThisMonthRows[0]?.value ?? 0;
  const eventRsvpsPreviousMonth = rsvpPreviousMonthRows[0]?.value ?? 0;
  const mentorshipMatches = mentorshipTotals[0]?.value ?? 0;
  const mentorshipNewThisQuarter = mentorshipThisQuarterRows[0]?.value ?? 0;
  const mentorshipPreviousQuarter =
    mentorshipPreviousQuarterRows[0]?.value ?? 0;
  const topCampaign = topCampaignRows[0] ?? null;

  const recentActivity: PortalDashboardActivity[] = [];
  const upcomingEvent = upcomingEventRows[0] ?? null;
  if (upcomingEvent) {
    recentActivity.push({
      type: "event",
      text: `Upcoming event: ${upcomingEvent.title}.`,
      time: upcomingEvent.startAt,
    });
  }

  const verifiedThisWeek = verifiedThisWeekRows[0];
  if (
    verifiedThisWeek &&
    verifiedThisWeek.value > 0 &&
    verifiedThisWeek.latestAt
  ) {
    recentActivity.push({
      type: "members",
      text: `${verifiedThisWeek.value.toLocaleString()} alumni profiles verified this week.`,
      time: verifiedThisWeek.latestAt,
    });
  }

  const latestMentorship = latestMentorshipRows[0] ?? null;
  if (latestMentorship?.respondedAt) {
    recentActivity.push({
      type: "mentorship",
      text: latestMentorship.field
        ? `New mentorship match accepted for ${latestMentorship.field}.`
        : "New mentorship match accepted.",
      time: latestMentorship.respondedAt,
    });
  }

  const latestCampaign = latestCampaignRows[0] ?? null;
  if (latestCampaign) {
    const progress = campaignProgressPercent(
      latestCampaign.raisedAmount,
      latestCampaign.goalAmount,
    );
    recentActivity.push({
      type: "giving",
      text:
        progress === null
          ? `${latestCampaign.title} received a giving update.`
          : `${latestCampaign.title} reached ${progress}% of target.`,
      time: latestCampaign.updatedAt,
    });
  }

  return {
    totalMembers: {
      value: totalMembers,
      newThisMonth: newMembersThisMonth,
      activeChapters: activeChapterRows[0]?.value ?? 0,
      comparisonPercent: comparisonPercent(
        newMembersThisMonth,
        previousMonthMembers,
      ),
    },
    eventRsvps: {
      value: eventRsvpsThisMonth,
      activeEventsThisMonth: activeEventsRows[0]?.value ?? 0,
      comparisonPercent: comparisonPercent(
        eventRsvpsThisMonth,
        eventRsvpsPreviousMonth,
      ),
    },
    mentorshipMatches: {
      value: mentorshipMatches,
      newThisQuarter: mentorshipNewThisQuarter,
      comparisonPercent: comparisonPercent(
        mentorshipNewThisQuarter,
        mentorshipPreviousQuarter,
      ),
    },
    givingCampaigns: {
      value: campaignTotals[0]?.activeCampaigns ?? 0,
      featuredCampaigns: campaignTotals[0]?.featuredCampaigns ?? 0,
      topCampaignProgressPercent: topCampaign
        ? campaignProgressPercent(
            topCampaign.raisedAmount,
            topCampaign.goalAmount,
          )
        : null,
      topCampaignTitle: topCampaign?.title ?? null,
      comparisonPercent: null,
    },
    recentActivity: [...recentActivity]
      .sort((left, right) => right.time.getTime() - left.time.getTime())
      .slice(0, 4),
  };
}
