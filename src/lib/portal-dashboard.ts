import {
  and,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  notExists,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  campaigns,
  chapters,
  electionCycles,
  electionPositions,
  electionVotes,
  eventRegistrations,
  events,
  generalPolls,
  mentorshipRequests,
  nominations,
  pollVotes,
} from "@/lib/db/schema";

export type PortalDashboardStat = {
  value: number;
  comparisonPercent: number | null;
};

export type PortalDashboardActivity = {
  type: "event" | "members" | "mentorship" | "giving";
  text: string;
  time: Date | string;
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

function dashboardTimeMs(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
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
      .sort(
        (left, right) =>
          dashboardTimeMs(right.time) - dashboardTimeMs(left.time),
      )
      .slice(0, 4),
  };
}

export type ActionItemKind =
  | "verification"
  | "profile"
  | "election_vote"
  | "election_nominate"
  | "poll"
  | "mentorship_request"
  | "event_rsvp";

export type DashboardActionItem = {
  id: string;
  kind: ActionItemKind;
  title: string;
  description: string | null;
  href: string;
  ctaLabel: string;
  dueAt: Date | null;
  urgent: boolean;
};

export type DashboardProfileSummary = {
  firstName: string | null;
  lastName: string | null;
  avatarKey: string | null;
  verificationStatus: "pending" | "verified" | "rejected" | null;
  completenessPercent: number;
  missingFields: string[];
};

export type PersonalDashboardData = {
  profile: DashboardProfileSummary;
  actionItems: DashboardActionItem[];
};

type ProfileFieldCheck = {
  label: string;
  filled: boolean;
};

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return Boolean(value);
}

function getProfileCompleteness(
  profile: typeof alumniProfiles.$inferSelect | null | undefined,
): { percent: number; missing: string[] } {
  if (!profile) {
    return { percent: 0, missing: ["Profile not started"] };
  }

  const checks: ProfileFieldCheck[] = [
    { label: "Profile photo", filled: isFilled(profile.avatarKey) },
    { label: "Graduation year", filled: isFilled(profile.yearOfCompletion) },
    {
      label: "Current role",
      filled: isFilled(profile.currentJobTitle) || isFilled(profile.currentEmployer),
    },
    { label: "Industry", filled: isFilled(profile.industry) },
    {
      label: "Location",
      filled: isFilled(profile.locationCity) || isFilled(profile.locationCountry),
    },
    { label: "Phone", filled: isFilled(profile.phone) },
    { label: "LinkedIn URL", filled: isFilled(profile.linkedinUrl) },
    { label: "Bio", filled: isFilled(profile.bio) },
  ];

  const filledCount = checks.filter((check) => check.filled).length;
  const percent = Math.round((filledCount / checks.length) * 100);
  const missing = checks.filter((check) => !check.filled).map((check) => check.label);

  return { percent, missing };
}

const ELECTION_PAGE_LIMIT = 3;
const EVENT_PAGE_LIMIT = 2;

export async function getPersonalDashboardData(
  userId: string,
): Promise<PersonalDashboardData> {
  const now = new Date();
  const twoWeeksOut = new Date(now);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  const [
    profileRow,
    activeCycles,
    positionCountRows,
    voteCountRows,
    nominationsByUserRows,
    openPollsRows,
    pendingMentorshipRows,
    upcomingEventRows,
  ] = await Promise.all([
    db.query.alumniProfiles.findFirst({
      where: eq(alumniProfiles.userId, userId),
    }),
    db
      .select({
        id: electionCycles.id,
        title: electionCycles.title,
        status: electionCycles.status,
        nominationCloses: electionCycles.nominationCloses,
        votingCloses: electionCycles.votingCloses,
      })
      .from(electionCycles)
      .where(
        inArray(electionCycles.status, ["nominations_open", "voting_open"]),
      ),
    db
      .select({
        cycleId: electionPositions.electionCycleId,
        count: sql<number>`count(*)::int`,
      })
      .from(electionPositions)
      .groupBy(electionPositions.electionCycleId),
    db
      .select({
        cycleId: electionVotes.electionCycleId,
        count: sql<number>`count(*)::int`,
      })
      .from(electionVotes)
      .where(eq(electionVotes.voterId, userId))
      .groupBy(electionVotes.electionCycleId),
    db
      .select({
        cycleId: nominations.electionCycleId,
        count: sql<number>`count(*)::int`,
      })
      .from(nominations)
      .where(eq(nominations.nominatedById, userId))
      .groupBy(nominations.electionCycleId),
    db
      .select({
        id: generalPolls.id,
        title: generalPolls.title,
        votingCloses: generalPolls.votingCloses,
        targetAudience: generalPolls.targetAudience,
        chapterId: generalPolls.chapterId,
      })
      .from(generalPolls)
      .where(
        and(
          eq(generalPolls.status, "open"),
          lte(generalPolls.votingOpens, now),
          gte(generalPolls.votingCloses, now),
          notExists(
            db
              .select({ id: pollVotes.id })
              .from(pollVotes)
              .where(
                and(
                  eq(pollVotes.pollId, generalPolls.id),
                  eq(pollVotes.voterId, userId),
                ),
              ),
          ),
        ),
      ),
    db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(mentorshipRequests)
      .where(
        and(
          eq(mentorshipRequests.mentorId, userId),
          eq(mentorshipRequests.status, "pending"),
        ),
      ),
    db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        startAt: events.startAt,
        rsvpDeadline: events.rsvpDeadline,
      })
      .from(events)
      .where(
        and(
          eq(events.isPublished, true),
          gte(events.startAt, now),
          lte(events.startAt, twoWeeksOut),
          notExists(
            db
              .select({ id: eventRegistrations.id })
              .from(eventRegistrations)
              .where(
                and(
                  eq(eventRegistrations.eventId, events.id),
                  eq(eventRegistrations.userId, userId),
                  or(
                    eq(eventRegistrations.status, "attending"),
                    eq(eventRegistrations.status, "waitlisted"),
                  ),
                ),
              ),
          ),
        ),
      )
      .orderBy(events.startAt)
      .limit(EVENT_PAGE_LIMIT),
  ]);

  const completeness = getProfileCompleteness(profileRow);
  const userChapterId = profileRow?.chapterId ?? null;
  const isVerified = profileRow?.verificationStatus === "verified";

  const positionCountsByCycle = new Map(
    positionCountRows.map((row) => [row.cycleId, row.count]),
  );
  const voteCountsByCycle = new Map(
    voteCountRows.map((row) => [row.cycleId, row.count]),
  );
  const nominationCountsByCycle = new Map(
    nominationsByUserRows.map((row) => [row.cycleId, row.count]),
  );

  const actionItems: DashboardActionItem[] = [];

  if (profileRow?.verificationStatus === "rejected") {
    actionItems.push({
      id: "verification:rejected",
      kind: "verification",
      title: "Your verification was rejected",
      description: "Update your details and resubmit for review.",
      href: "/profile",
      ctaLabel: "Update profile",
      dueAt: null,
      urgent: true,
    });
  } else if (
    !profileRow ||
    profileRow.verificationStatus === "pending"
  ) {
    actionItems.push({
      id: "verification:pending",
      kind: "verification",
      title: "Verification in progress",
      description: "Our team is reviewing your alumni status.",
      href: "/profile",
      ctaLabel: "View profile",
      dueAt: null,
      urgent: false,
    });
  }

  if (completeness.percent < 100 && completeness.missing.length > 0) {
    const previewMissing = completeness.missing.slice(0, 3).join(", ");
    actionItems.push({
      id: "profile:complete",
      kind: "profile",
      title: `Complete your profile (${completeness.percent}%)`,
      description: `Add ${previewMissing}${completeness.missing.length > 3 ? "…" : ""}`,
      href: "/profile",
      ctaLabel: "Finish profile",
      dueAt: null,
      urgent: completeness.percent < 50,
    });
  }

  for (const cycle of activeCycles) {
    if (cycle.status === "voting_open") {
      const total = positionCountsByCycle.get(cycle.id) ?? 0;
      const voted = voteCountsByCycle.get(cycle.id) ?? 0;
      if (total === 0 || voted >= total) continue;
      const remaining = total - voted;
      actionItems.push({
        id: `election:vote:${cycle.id}`,
        kind: "election_vote",
        title: `Vote in ${cycle.title}`,
        description:
          remaining === total
            ? `${total} position${total === 1 ? "" : "s"} awaiting your vote.`
            : `${remaining} of ${total} position${total === 1 ? "" : "s"} left to vote on.`,
        href: `/voting/elections/${cycle.id}`,
        ctaLabel: "Cast votes",
        dueAt: cycle.votingCloses,
        urgent: cycle.votingCloses.getTime() - now.getTime() < 1000 * 60 * 60 * 24,
      });
    } else if (cycle.status === "nominations_open") {
      const submitted = nominationCountsByCycle.get(cycle.id) ?? 0;
      if (submitted > 0) continue;
      actionItems.push({
        id: `election:nominate:${cycle.id}`,
        kind: "election_nominate",
        title: `Nominate a candidate · ${cycle.title}`,
        description: "Nominations close soon. Put forward a fellow alum.",
        href: "/voting",
        ctaLabel: "Submit nomination",
        dueAt: cycle.nominationCloses,
        urgent:
          cycle.nominationCloses.getTime() - now.getTime() < 1000 * 60 * 60 * 24,
      });
    }
  }

  for (const poll of openPollsRows) {
    const audienceAllowed =
      poll.targetAudience === "all_members" ||
      (poll.targetAudience === "verified_only" && isVerified) ||
      (poll.targetAudience === "chapter" &&
        poll.chapterId !== null &&
        poll.chapterId === userChapterId);
    if (!audienceAllowed) continue;

    actionItems.push({
      id: `poll:${poll.id}`,
      kind: "poll",
      title: `Poll: ${poll.title}`,
      description: "Your input still pending.",
      href: `/voting/polls/${poll.id}`,
      ctaLabel: "Vote",
      dueAt: poll.votingCloses,
      urgent: poll.votingCloses.getTime() - now.getTime() < 1000 * 60 * 60 * 24,
    });
  }

  const pendingMentorshipCount = pendingMentorshipRows[0]?.count ?? 0;
  if (pendingMentorshipCount > 0) {
    actionItems.push({
      id: "mentorship:pending",
      kind: "mentorship_request",
      title:
        pendingMentorshipCount === 1
          ? "1 mentorship request awaiting your reply"
          : `${pendingMentorshipCount} mentorship requests awaiting your reply`,
      description: "Accept or decline so mentees aren't kept waiting.",
      href: "/mentorship",
      ctaLabel: "Review requests",
      dueAt: null,
      urgent: false,
    });
  }

  for (const ev of upcomingEventRows) {
    actionItems.push({
      id: `event:${ev.id}`,
      kind: "event_rsvp",
      title: `RSVP: ${ev.title}`,
      description: null,
      href: `/events/${ev.slug}`,
      ctaLabel: "Respond",
      dueAt: ev.rsvpDeadline ?? ev.startAt,
      urgent:
        (ev.rsvpDeadline ?? ev.startAt).getTime() - now.getTime() <
        1000 * 60 * 60 * 24 * 2,
    });
  }

  actionItems.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const aDue = a.dueAt ? a.dueAt.getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? b.dueAt.getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });

  return {
    profile: {
      firstName: profileRow?.firstName ?? null,
      lastName: profileRow?.lastName ?? null,
      avatarKey: profileRow?.avatarKey ?? null,
      verificationStatus: profileRow?.verificationStatus ?? null,
      completenessPercent: completeness.percent,
      missingFields: completeness.missing,
    },
    actionItems: actionItems.slice(0, ELECTION_PAGE_LIMIT * 2 + 6),
  };
}
