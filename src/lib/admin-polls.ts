import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumniProfiles, generalPolls, pollVotes } from "@/lib/db/schema";

export async function listPollsForAdmin() {
  const rows = await db
    .select({
      poll: generalPolls,
      participationCount: sql<number>`count(${pollVotes.id})::int`,
    })
    .from(generalPolls)
    .leftJoin(pollVotes, eq(pollVotes.pollId, generalPolls.id))
    .groupBy(generalPolls.id)
    .orderBy(desc(generalPolls.createdAt));

  const eligibleCountRow = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(alumniProfiles)
    .where(eq(alumniProfiles.verificationStatus, "verified"));
  const eligibleCount = eligibleCountRow[0]?.value ?? 0;

  return rows.map((row) => {
    const participationPercent =
      eligibleCount > 0 ? Number(((row.participationCount / eligibleCount) * 100).toFixed(2)) : 0;
    return {
      ...row.poll,
      participationCount: row.participationCount,
      quorumMet: participationPercent >= row.poll.quorumPercent,
      participationPercent,
      eligibleCount,
    };
  });
}

export async function createPoll(input: {
  title: string;
  description: string | null;
  pollType: "yes_no_abstain" | "multiple_choice" | "ranked_choice";
  options: string[] | null;
  votingOpens: Date;
  votingCloses: Date;
  quorumPercent: number;
  targetAudience: "all_members" | "verified_only" | "chapter";
  chapterId: string | null;
  isAnonymous: boolean;
  createdBy: string;
}) {
  await db.insert(generalPolls).values({
    title: input.title,
    description: input.description,
    pollType: input.pollType,
    options: input.options,
    votingOpens: input.votingOpens,
    votingCloses: input.votingCloses,
    quorumPercent: input.quorumPercent,
    targetAudience: input.targetAudience,
    chapterId: input.targetAudience === "chapter" ? input.chapterId : null,
    isAnonymous: input.isAnonymous,
    status: "draft",
    createdBy: input.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updatePollStatus(
  pollId: string,
  status: "draft" | "open" | "closed" | "results_published",
) {
  await db
    .update(generalPolls)
    .set({
      status,
      resultsPublished: status === "results_published" ? true : undefined,
      updatedAt: new Date(),
    })
    .where(eq(generalPolls.id, pollId));
}

export async function togglePollResultsPublished(pollId: string, published: boolean) {
  await db
    .update(generalPolls)
    .set({
      resultsPublished: published,
      status: published ? "results_published" : "closed",
      updatedAt: new Date(),
    })
    .where(eq(generalPolls.id, pollId));
}

export async function getPollResultsForAdmin(pollId: string) {
  const [poll, rows, totalRow] = await Promise.all([
    db.query.generalPolls.findFirst({
      where: eq(generalPolls.id, pollId),
    }),
    db
      .select({
        choice: sql<string>`cast(${pollVotes.choice} as text)`,
        count: sql<number>`count(*)::int`,
      })
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId))
      .groupBy(sql`cast(${pollVotes.choice} as text)`)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId)),
  ]);
  if (!poll) return null;

  const total = totalRow[0]?.value ?? 0;

  const byVoter = poll.isAnonymous
    ? []
    : await db
        .select({
          voterId: pollVotes.voterId,
          choice: sql<string>`cast(${pollVotes.choice} as text)`,
          castAt: pollVotes.castAt,
        })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId))
        .orderBy(asc(pollVotes.castAt));

  return {
    poll,
    total,
    aggregate: rows.map((row) => ({
      choice: row.choice,
      count: row.count,
      percentage: total > 0 ? Number(((row.count / total) * 100).toFixed(2)) : 0,
    })),
    byVoter,
  };
}

export async function countPollParticipation(pollId: string) {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, pollId));
  return row?.value ?? 0;
}
