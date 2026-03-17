import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getActiveElectionCycles, getActivePollsForMember, getElectionResults } from "@/db/queries/elections";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  electionCycles,
  electionPositions,
  electionVotes,
  generalPolls,
  nominations,
  pollVotes,
  users,
} from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

export type VotingHubElection = {
  id: string;
  title: string;
  status: "nominations_open" | "voting_open";
  nominationCloses: Date;
  votingCloses: Date;
  hasVotedAllPositions: boolean;
  positionsCount: number;
  votesCastCount: number;
};

export type VotingHubPoll = {
  id: string;
  title: string;
  description: string | null;
  pollType: "yes_no_abstain" | "multiple_choice" | "ranked_choice";
  votingCloses: Date;
  isAnonymous: boolean;
};

type ActiveElectionCycleRecord = Awaited<ReturnType<typeof getActiveElectionCycles>>[number];

export async function getVotingHubData(userId: string): Promise<{
  elections: VotingHubElection[];
  polls: VotingHubPoll[];
}> {
  const cycles = (await getActiveElectionCycles()).filter(
    (
      cycle,
    ): cycle is ActiveElectionCycleRecord & {
      status: "nominations_open" | "voting_open";
    } => cycle.status === "nominations_open" || cycle.status === "voting_open",
  );
  const cycleIds = cycles.map((cycle) => cycle.id);

  if (cycleIds.length === 0) {
    const polls = await getActivePollsForMember(userId);
    return {
      elections: [],
      polls: polls.map((poll) => ({
        id: poll.id,
        title: poll.title,
        description: poll.description,
        pollType: poll.pollType,
        votingCloses: poll.votingCloses,
        isAnonymous: poll.isAnonymous,
      })),
    };
  }

  const [positionCounts, voteCounts, polls] = await Promise.all([
    db
      .select({
        cycleId: electionPositions.electionCycleId,
        count: sql<number>`count(*)::int`,
      })
      .from(electionPositions)
      .where(inArray(electionPositions.electionCycleId, cycleIds))
      .groupBy(electionPositions.electionCycleId),
    db
      .select({
        cycleId: electionVotes.electionCycleId,
        count: sql<number>`count(*)::int`,
      })
      .from(electionVotes)
      .where(and(inArray(electionVotes.electionCycleId, cycleIds), eq(electionVotes.voterId, userId)))
      .groupBy(electionVotes.electionCycleId),
    getActivePollsForMember(userId),
  ]);

  const positionCountByCycle = new Map(positionCounts.map((row) => [row.cycleId, row.count]));
  const voteCountByCycle = new Map(voteCounts.map((row) => [row.cycleId, row.count]));

  return {
    elections: cycles.map((cycle) => {
      const positionsCount = positionCountByCycle.get(cycle.id) ?? 0;
      const votesCastCount = voteCountByCycle.get(cycle.id) ?? 0;
      return {
        id: cycle.id,
        title: cycle.title,
        status: cycle.status,
        nominationCloses: cycle.nominationCloses,
        votingCloses: cycle.votingCloses,
        hasVotedAllPositions: positionsCount > 0 && votesCastCount >= positionsCount,
        positionsCount,
        votesCastCount,
      };
    }),
    polls: polls.map((poll) => ({
      id: poll.id,
      title: poll.title,
      description: poll.description,
      pollType: poll.pollType,
      votingCloses: poll.votingCloses,
      isAnonymous: poll.isAnonymous,
    })),
  };
}

export async function getElectionCyclePageData(cycleId: string, userId: string) {
  const cycle = await db.query.electionCycles.findFirst({
    where: eq(electionCycles.id, cycleId),
  });
  if (!cycle) {
    return null;
  }

  const [positions, approvedNominations, viewerNominations, viewerVotes, viewerProfile, alumniCandidates] =
    await Promise.all([
      db.query.electionPositions.findMany({
        where: eq(electionPositions.electionCycleId, cycleId),
        orderBy: [asc(electionPositions.sortOrder), asc(electionPositions.title)],
      }),
      db
        .select({
          nominationId: nominations.id,
          positionId: nominations.positionId,
          nomineeId: nominations.nomineeId,
          manifesto: nominations.manifesto,
          nomineeName: users.name,
          avatarKey: alumniProfiles.avatarKey,
          firstName: alumniProfiles.firstName,
          lastName: alumniProfiles.lastName,
          yearOfCompletion: alumniProfiles.yearOfCompletion,
        })
        .from(nominations)
        .innerJoin(users, eq(users.id, nominations.nomineeId))
        .leftJoin(alumniProfiles, eq(alumniProfiles.userId, nominations.nomineeId))
        .where(and(eq(nominations.electionCycleId, cycleId), eq(nominations.status, "approved"))),
      db.query.nominations.findMany({
        where: and(eq(nominations.electionCycleId, cycleId), eq(nominations.nomineeId, userId)),
      }),
      db.query.electionVotes.findMany({
        where: and(eq(electionVotes.electionCycleId, cycleId), eq(electionVotes.voterId, userId)),
      }),
      db.query.alumniProfiles.findFirst({
        where: eq(alumniProfiles.userId, userId),
        columns: { verificationStatus: true, chapterId: true, yearOfCompletion: true },
      }),
      db
        .select({
          userId: users.id,
          fullName: users.name,
          firstName: alumniProfiles.firstName,
          lastName: alumniProfiles.lastName,
          yearOfCompletion: alumniProfiles.yearOfCompletion,
        })
        .from(alumniProfiles)
        .innerJoin(users, eq(users.id, alumniProfiles.userId))
        .where(eq(alumniProfiles.verificationStatus, "verified"))
        .orderBy(asc(alumniProfiles.lastName), asc(alumniProfiles.firstName))
        .limit(300),
    ]);

  const nominationsByPosition = new Map<
    string,
    Array<{
      nominationId: string;
      nomineeId: string;
      nomineeName: string;
      avatarUrl: string | null;
      yearOfCompletion: number | null;
      manifesto: string | null;
    }>
  >();

  for (const row of approvedNominations) {
    const bucket = nominationsByPosition.get(row.positionId) ?? [];
    bucket.push({
      nominationId: row.nominationId,
      nomineeId: row.nomineeId,
      nomineeName:
        row.firstName && row.lastName ? `${row.firstName} ${row.lastName}`.trim() : row.nomineeName,
      avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
      yearOfCompletion: row.yearOfCompletion,
      manifesto: row.manifesto,
    });
    nominationsByPosition.set(row.positionId, bucket);
  }

  return {
    cycle,
    positions,
    nominationsByPosition,
    viewerNominations,
    viewerVotes,
    isVerified: viewerProfile?.verificationStatus === "verified",
    alumniCandidates: alumniCandidates.map((candidate) => ({
      id: candidate.userId,
      fullName:
        candidate.firstName && candidate.lastName
          ? `${candidate.firstName} ${candidate.lastName}`.trim()
          : candidate.fullName,
      yearOfCompletion: candidate.yearOfCompletion,
    })),
  };
}

export async function getPollPageData(pollId: string, userId: string) {
  const poll = await db.query.generalPolls.findFirst({
    where: eq(generalPolls.id, pollId),
  });
  if (!poll) {
    return null;
  }

  const [existingVote, results] = await Promise.all([
    db.query.pollVotes.findFirst({
      where: and(eq(pollVotes.pollId, pollId), eq(pollVotes.voterId, userId)),
    }),
    poll.resultsPublished
      ? db
          .select({
            choice: sql<string>`cast(${pollVotes.choice} as text)`,
            count: sql<number>`count(*)::int`,
          })
          .from(pollVotes)
          .where(eq(pollVotes.pollId, pollId))
          .groupBy(sql`cast(${pollVotes.choice} as text)`)
          .orderBy(desc(sql`count(*)`))
      : Promise.resolve([]),
  ]);

  const totalVotes = results.reduce((sum, row) => sum + row.count, 0);

  return {
    poll,
    existingVote,
    results: results.map((row) => ({
      choice: row.choice,
      count: row.count,
      percentage: totalVotes === 0 ? 0 : Number(((row.count / totalVotes) * 100).toFixed(2)),
    })),
    totalVotes,
  };
}

export async function getElectionResultsPageData(cycleId: string) {
  const cycle = await db.query.electionCycles.findFirst({
    where: eq(electionCycles.id, cycleId),
  });

  if (!cycle || !cycle.resultsPublished) {
    return null;
  }

  const [results, eligibleCountRow, turnoutRow] = await Promise.all([
    getElectionResults(cycleId),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(alumniProfiles)
      .where(eq(alumniProfiles.verificationStatus, "verified")),
    db
      .select({ value: sql<number>`count(distinct ${electionVotes.voterId})::int` })
      .from(electionVotes)
      .where(eq(electionVotes.electionCycleId, cycleId)),
  ]);

  const groups = new Map<
    string,
    {
      positionId: string;
      positionTitle: string;
      items: Array<{ nomineeName: string; voteCount: number; percentage: number }>;
      winnerName: string | null;
    }
  >();

  for (const row of results) {
    const key = row.positionId;
    const group =
      groups.get(key) ??
      ({
        positionId: row.positionId,
        positionTitle: row.positionTitle,
        items: [],
        winnerName: null,
      } as const);
    groups.set(key, {
      ...group,
      items: [
        ...group.items,
        {
          nomineeName:
            row.firstName && row.lastName ? `${row.firstName} ${row.lastName}`.trim() : row.nomineeName,
          voteCount: row.voteCount,
          percentage: 0,
        },
      ],
      winnerName: null,
    });
  }

  const positions = Array.from(groups.values()).map((group) => {
    const total = group.items.reduce((sum, item) => sum + item.voteCount, 0);
    const items = group.items.map((item) => ({
      ...item,
      percentage: total > 0 ? Number(((item.voteCount / total) * 100).toFixed(2)) : 0,
    }));
    const winnerName = items[0]?.nomineeName ?? null;
    return {
      ...group,
      items,
      winnerName,
    };
  });

  const eligibleCount = eligibleCountRow[0]?.value ?? 0;
  const turnoutCount = turnoutRow[0]?.value ?? 0;

  return {
    cycle,
    positions,
    turnoutCount,
    eligibleCount,
    turnoutPercent: eligibleCount > 0 ? Number(((turnoutCount / eligibleCount) * 100).toFixed(2)) : 0,
  };
}
