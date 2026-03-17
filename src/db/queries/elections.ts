import { and, asc, desc, eq, inArray, notExists, or, sql } from "drizzle-orm";

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

export async function getActiveElectionCycles() {
  return db
    .select()
    .from(electionCycles)
    .where(inArray(electionCycles.status, ["nominations_open", "voting_open"]))
    .orderBy(asc(electionCycles.votingOpens));
}

export async function getNominationsByPosition(positionId: string) {
  return db
    .select({
      nominationId: nominations.id,
      electionCycleId: nominations.electionCycleId,
      positionId: nominations.positionId,
      manifesto: nominations.manifesto,
      status: nominations.status,
      createdAt: nominations.createdAt,
      nomineeId: users.id,
      nomineeName: users.name,
      nomineeEmail: users.email,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      avatarKey: alumniProfiles.avatarKey,
      yearOfCompletion: alumniProfiles.yearOfCompletion,
      currentJobTitle: alumniProfiles.currentJobTitle,
      currentEmployer: alumniProfiles.currentEmployer,
    })
    .from(nominations)
    .innerJoin(users, eq(users.id, nominations.nomineeId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, nominations.nomineeId))
    .where(and(eq(nominations.positionId, positionId), eq(nominations.status, "approved")))
    .orderBy(asc(alumniProfiles.lastName), asc(alumniProfiles.firstName), asc(users.name));
}

export async function getElectionResults(cycleId: string) {
  return db
    .select({
      positionId: electionPositions.id,
      positionTitle: electionPositions.title,
      nominationId: nominations.id,
      nomineeUserId: nominations.nomineeId,
      nomineeName: users.name,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      voteCount: sql<number>`count(${electionVotes.id})::int`,
    })
    .from(electionVotes)
    .innerJoin(electionPositions, eq(electionPositions.id, electionVotes.positionId))
    .innerJoin(nominations, eq(nominations.id, electionVotes.nomineeId))
    .innerJoin(users, eq(users.id, nominations.nomineeId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, nominations.nomineeId))
    .where(eq(electionVotes.electionCycleId, cycleId))
    .groupBy(
      electionPositions.id,
      electionPositions.title,
      nominations.id,
      nominations.nomineeId,
      users.name,
      alumniProfiles.firstName,
      alumniProfiles.lastName,
    )
    .orderBy(asc(electionPositions.sortOrder), desc(sql`count(${electionVotes.id})`), asc(users.name));
}

export async function hasVoted(voterId: string, positionId: string): Promise<boolean> {
  const [vote] = await db
    .select({ id: electionVotes.id })
    .from(electionVotes)
    .where(and(eq(electionVotes.voterId, voterId), eq(electionVotes.positionId, positionId)))
    .limit(1);

  return Boolean(vote);
}

export async function getActivePollsForMember(userId: string) {
  const now = new Date();
  const viewerProfile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, userId),
    columns: {
      chapterId: true,
      verificationStatus: true,
    },
  });
  const isVerified = viewerProfile?.verificationStatus === "verified";

  return db
    .select()
    .from(generalPolls)
    .where(
      and(
        eq(generalPolls.status, "open"),
        sql`${generalPolls.votingOpens} <= ${now}`,
        sql`${generalPolls.votingCloses} >= ${now}`,
        or(
          eq(generalPolls.targetAudience, "all_members"),
          and(eq(generalPolls.targetAudience, "verified_only"), eq(sql`${isVerified}`, true)),
          and(
            eq(generalPolls.targetAudience, "chapter"),
            viewerProfile?.chapterId
              ? eq(generalPolls.chapterId, viewerProfile.chapterId)
              : eq(sql`false`, sql`true`),
          ),
        ),
        notExists(
          db
            .select({ id: pollVotes.id })
            .from(pollVotes)
            .where(and(eq(pollVotes.pollId, generalPolls.id), eq(pollVotes.voterId, userId))),
        ),
      ),
    )
    .orderBy(asc(generalPolls.votingCloses));
}

export async function getPollResults(pollId: string) {
  const rows = await db
    .select({
      choice: sql<string>`cast(${pollVotes.choice} as text)`,
      count: sql<number>`count(*)::int`,
    })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, pollId))
    .groupBy(sql`cast(${pollVotes.choice} as text)`)
    .orderBy(desc(sql`count(*)`));

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return rows.map((row) => ({
    choice: row.choice,
    count: row.count,
    percentage: total > 0 ? Number(((row.count / total) * 100).toFixed(2)) : 0,
  }));
}
