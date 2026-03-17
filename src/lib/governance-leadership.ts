import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  electionCycles,
  electionPositions,
  electionVotes,
  governanceAppointments,
  nominations,
  users,
} from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

export type LeadershipPerson = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  graduationYear: number | null;
  position: string;
  termStart: Date | null;
  termEnd: Date | null;
  bio: string | null;
  source: "election_results" | "appointment";
  voteCount: number | null;
};

export type UpcomingElectionBanner = {
  cycleId: string;
  title: string;
  status: "nominations_open" | "voting_open";
  closesAt: Date;
} | null;

export type PastElectionSummary = {
  cycleId: string;
  title: string;
  votingCloses: Date;
  winners: Array<{
    positionTitle: string;
    winnerName: string;
    voteCount: number;
  }>;
};

export async function getUpcomingElectionBanner(): Promise<UpcomingElectionBanner> {
  const row = await db.query.electionCycles.findFirst({
    where: inArray(electionCycles.status, ["nominations_open", "voting_open"]),
    orderBy: [asc(electionCycles.votingCloses)],
  });
  if (!row || (row.status !== "nominations_open" && row.status !== "voting_open")) {
    return null;
  }
  return {
    cycleId: row.id,
    title: row.title,
    status: row.status,
    closesAt: row.status === "nominations_open" ? row.nominationCloses : row.votingCloses,
  };
}

async function getLeadershipFromPublishedElection(): Promise<LeadershipPerson[]> {
  const latestPublished = await db.query.electionCycles.findFirst({
    where: eq(electionCycles.resultsPublished, true),
    orderBy: [desc(electionCycles.votingCloses)],
  });
  if (!latestPublished) {
    return [];
  }

  const rows = await db
    .select({
      positionId: electionPositions.id,
      positionTitle: electionPositions.title,
      sortOrder: electionPositions.sortOrder,
      nomineeUserId: nominations.nomineeId,
      nomineeName: users.name,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      avatarKey: alumniProfiles.avatarKey,
      graduationYear: alumniProfiles.yearOfCompletion,
      bio: alumniProfiles.bio,
      voteCount: sql<number>`count(${electionVotes.id})::int`,
    })
    .from(electionVotes)
    .innerJoin(electionPositions, eq(electionPositions.id, electionVotes.positionId))
    .innerJoin(nominations, eq(nominations.id, electionVotes.nomineeId))
    .innerJoin(users, eq(users.id, nominations.nomineeId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, nominations.nomineeId))
    .where(eq(electionVotes.electionCycleId, latestPublished.id))
    .groupBy(
      electionPositions.id,
      electionPositions.title,
      electionPositions.sortOrder,
      nominations.nomineeId,
      users.name,
      alumniProfiles.firstName,
      alumniProfiles.lastName,
      alumniProfiles.avatarKey,
      alumniProfiles.yearOfCompletion,
      alumniProfiles.bio,
    )
    .orderBy(asc(electionPositions.sortOrder), desc(sql`count(${electionVotes.id})`), asc(users.name));

  const seenPosition = new Set<string>();
  const leaders: LeadershipPerson[] = [];
  for (const row of rows) {
    if (seenPosition.has(row.positionId)) {
      continue;
    }
    seenPosition.add(row.positionId);
    leaders.push({
      userId: row.nomineeUserId,
      fullName: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}`.trim() : row.nomineeName,
      avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
      graduationYear: row.graduationYear,
      position: row.positionTitle,
      termStart: latestPublished.votingOpens,
      termEnd: latestPublished.votingCloses,
      bio: row.bio,
      source: "election_results",
      voteCount: row.voteCount,
    });
  }

  return leaders;
}

async function getLeadershipFromAppointments(): Promise<LeadershipPerson[]> {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      avatarKey: alumniProfiles.avatarKey,
      graduationYear: alumniProfiles.yearOfCompletion,
      bio: alumniProfiles.bio,
      position: governanceAppointments.position,
      termStart: governanceAppointments.termStart,
      termEnd: governanceAppointments.termEnd,
    })
    .from(governanceAppointments)
    .innerJoin(users, eq(users.id, governanceAppointments.userId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
    .where(eq(governanceAppointments.isCurrent, true))
    .orderBy(asc(governanceAppointments.position), asc(users.name));

  return rows.map((row) => ({
    userId: row.userId,
    fullName: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}`.trim() : row.name,
    avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
    graduationYear: row.graduationYear,
    position: row.position,
    termStart: row.termStart ? new Date(row.termStart) : null,
    termEnd: row.termEnd ? new Date(row.termEnd) : null,
    bio: row.bio,
    source: "appointment",
    voteCount: null,
  }));
}

export async function getCurrentLeadership(): Promise<LeadershipPerson[]> {
  const byElection = await getLeadershipFromPublishedElection();
  if (byElection.length > 0) {
    return byElection;
  }
  return getLeadershipFromAppointments();
}

export async function listPastElectionSummaries(): Promise<PastElectionSummary[]> {
  const cycles = await db
    .select({
      id: electionCycles.id,
      title: electionCycles.title,
      votingCloses: electionCycles.votingCloses,
    })
    .from(electionCycles)
    .where(eq(electionCycles.resultsPublished, true))
    .orderBy(desc(electionCycles.votingCloses))
    .limit(8);

  const summaries: PastElectionSummary[] = [];
  for (const cycle of cycles) {
    const winners = await db.execute<{
      positionTitle: string;
      winnerName: string;
      voteCount: number;
    }>(sql`
      with ranked as (
        select
          ep.id as position_id,
          ep.title as "positionTitle",
          coalesce(ap.first_name || ' ' || ap.last_name, u.name) as "winnerName",
          count(ev.id)::int as "voteCount",
          row_number() over (partition by ep.id order by count(ev.id) desc, u.name asc) as rank
        from election_votes ev
        inner join election_positions ep on ep.id = ev.position_id
        inner join nominations n on n.id = ev.nominee_id
        inner join users u on u.id = n.nominee_id
        left join alumni_profiles ap on ap.user_id = u.id
        where ev.election_cycle_id = ${cycle.id}
        group by ep.id, ep.title, ap.first_name, ap.last_name, u.name
      )
      select
        "positionTitle",
        "winnerName",
        "voteCount"
      from ranked
      where rank = 1
      order by "positionTitle" asc
    `);

    summaries.push({
      cycleId: cycle.id,
      title: cycle.title,
      votingCloses: cycle.votingCloses,
      winners: winners.rows,
    });
  }

  return summaries;
}

export async function getLeaderProfile(userId: string) {
  const userRow = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      avatarKey: alumniProfiles.avatarKey,
      graduationYear: alumniProfiles.yearOfCompletion,
      bio: alumniProfiles.bio,
      currentJobTitle: alumniProfiles.currentJobTitle,
      currentEmployer: alumniProfiles.currentEmployer,
    })
    .from(users)
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!userRow) {
    return null;
  }

  const [currentRole, pastRoles] = await Promise.all([
    db
      .select({
        position: governanceAppointments.position,
        termStart: governanceAppointments.termStart,
        termEnd: governanceAppointments.termEnd,
      })
      .from(governanceAppointments)
      .where(and(eq(governanceAppointments.userId, userId), eq(governanceAppointments.isCurrent, true)))
      .orderBy(desc(governanceAppointments.termStart))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db.execute<{
      positionTitle: string;
      cycleTitle: string;
      termStart: Date;
      termEnd: Date;
    }>(sql`
      with ranked as (
        select
          ep.id as position_id,
          ep.title as "positionTitle",
          ec.title as "cycleTitle",
          ec.voting_opens as "termStart",
          ec.voting_closes as "termEnd",
          count(ev.id)::int as votes,
          row_number() over (partition by ep.id, ec.id order by count(ev.id) desc, ep.title asc) as rank
        from election_votes ev
        inner join election_positions ep on ep.id = ev.position_id
        inner join election_cycles ec on ec.id = ev.election_cycle_id
        inner join nominations n on n.id = ev.nominee_id
        where n.nominee_id = ${userId}
          and ec.results_published = true
        group by ep.id, ep.title, ec.id, ec.title, ec.voting_opens, ec.voting_closes
      )
      select
        "positionTitle",
        "cycleTitle",
        "termStart",
        "termEnd"
      from ranked
      where rank = 1
      order by "termEnd" desc
    `),
  ]);

  return {
    userId: userRow.id,
    fullName:
      userRow.firstName && userRow.lastName ? `${userRow.firstName} ${userRow.lastName}`.trim() : userRow.name,
    email: userRow.email,
    avatarUrl: userRow.avatarKey ? buildR2PublicUrl(userRow.avatarKey) : null,
    graduationYear: userRow.graduationYear,
    bio: userRow.bio,
    currentJobTitle: userRow.currentJobTitle,
    currentEmployer: userRow.currentEmployer,
    position: currentRole?.position ?? pastRoles.rows[0]?.positionTitle ?? "Leader",
    termStart: currentRole?.termStart ? new Date(currentRole.termStart) : pastRoles.rows[0]?.termStart ?? null,
    termEnd: currentRole?.termEnd ? new Date(currentRole.termEnd) : pastRoles.rows[0]?.termEnd ?? null,
    pastPositions: pastRoles.rows,
  };
}
