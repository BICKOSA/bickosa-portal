import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { createElement } from "react";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  electionCycles,
  electionPositions,
  electionVotes,
  nominations,
  users,
} from "@/lib/db/schema";
import { createNotificationsForUsers } from "@/lib/notifications/create-notification";
import { sendEmail } from "@/lib/email/resend";

export type ElectionStatus = (typeof electionCycles.$inferSelect)["status"];

export async function listElectionCyclesForAdmin() {
  const rows = await db
    .select()
    .from(electionCycles)
    .orderBy(desc(electionCycles.createdAt));
  return rows;
}

export async function createElectionCycle(input: {
  title: string;
  description: string | null;
  nominationOpens: Date;
  nominationCloses: Date;
  votingOpens: Date;
  votingCloses: Date;
  quorumPercent: number;
  createdBy: string;
}) {
  const [row] = await db
    .insert(electionCycles)
    .values({
      title: input.title,
      description: input.description,
      nominationOpens: input.nominationOpens,
      nominationCloses: input.nominationCloses,
      votingOpens: input.votingOpens,
      votingCloses: input.votingCloses,
      quorumPercent: input.quorumPercent,
      createdBy: input.createdBy,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: electionCycles.id });

  return row?.id ?? null;
}

export async function listElectionPositions(cycleId: string) {
  return db
    .select()
    .from(electionPositions)
    .where(eq(electionPositions.electionCycleId, cycleId))
    .orderBy(asc(electionPositions.sortOrder), asc(electionPositions.title));
}

export async function createElectionPosition(input: {
  cycleId: string;
  title: string;
  description: string | null;
  maxWinners: number;
  maxNominations: number;
}) {
  const currentMax = await db
    .select({ value: sql<number>`coalesce(max(${electionPositions.sortOrder}), -1)::int` })
    .from(electionPositions)
    .where(eq(electionPositions.electionCycleId, input.cycleId));

  await db.insert(electionPositions).values({
    electionCycleId: input.cycleId,
    title: input.title,
    description: input.description,
    maxWinners: input.maxWinners,
    maxNominations: input.maxNominations,
    sortOrder: (currentMax[0]?.value ?? -1) + 1,
    createdAt: new Date(),
  });
}

export async function updateElectionPosition(
  positionId: string,
  input: {
    title: string;
    description: string | null;
    maxWinners: number;
    maxNominations: number;
  },
) {
  await db
    .update(electionPositions)
    .set({
      title: input.title,
      description: input.description,
      maxWinners: input.maxWinners,
      maxNominations: input.maxNominations,
    })
    .where(eq(electionPositions.id, positionId));
}

export async function deleteElectionPosition(positionId: string) {
  await db.delete(electionPositions).where(eq(electionPositions.id, positionId));
}

export async function reorderElectionPositions(cycleId: string, orderedPositionIds: string[]) {
  await db.transaction(async (tx) => {
    for (let index = 0; index < orderedPositionIds.length; index += 1) {
      const positionId = orderedPositionIds[index];
      if (!positionId) continue;
      await tx
        .update(electionPositions)
        .set({ sortOrder: index })
        .where(and(eq(electionPositions.id, positionId), eq(electionPositions.electionCycleId, cycleId)));
    }
  });
}

function nextStatus(status: ElectionStatus): ElectionStatus | null {
  if (status === "draft") return "nominations_open";
  if (status === "nominations_open") return "nominations_closed";
  if (status === "nominations_closed") return "voting_open";
  if (status === "voting_open") return "voting_closed";
  if (status === "voting_closed") return "results_published";
  return null;
}

export async function getElectionTurnoutStats(cycleId: string) {
  const [eligibleCountRow, votedCountRow, perPositionRows] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(alumniProfiles)
      .where(eq(alumniProfiles.verificationStatus, "verified")),
    db
      .select({ value: sql<number>`count(distinct ${electionVotes.voterId})::int` })
      .from(electionVotes)
      .where(eq(electionVotes.electionCycleId, cycleId)),
    db.execute<{
      positionId: string;
      positionTitle: string;
      votedCount: number;
    }>(sql`
      select
        ep.id as "positionId",
        ep.title as "positionTitle",
        count(distinct ev.voter_id)::int as "votedCount"
      from election_positions ep
      left join election_votes ev on ev.position_id = ep.id and ev.election_cycle_id = ${cycleId}
      where ep.election_cycle_id = ${cycleId}
      group by ep.id, ep.title
      order by ep.sort_order asc, ep.title asc
    `),
  ]);

  const eligibleCount = eligibleCountRow[0]?.value ?? 0;
  const votedCount = votedCountRow[0]?.value ?? 0;
  const turnoutPercent = eligibleCount > 0 ? Number(((votedCount / eligibleCount) * 100).toFixed(2)) : 0;

  return {
    eligibleCount,
    votedCount,
    turnoutPercent,
    perPosition: perPositionRows.rows.map((row) => ({
      positionId: row.positionId,
      positionTitle: row.positionTitle,
      eligibleCount,
      votedCount: row.votedCount,
      remainingCount: Math.max(0, eligibleCount - row.votedCount),
    })),
  };
}

export async function advanceElectionCycleStatus(
  cycleId: string,
  input?: { publishDespiteQuorum?: boolean },
) {
  const cycle = await db.query.electionCycles.findFirst({
    where: eq(electionCycles.id, cycleId),
  });
  if (!cycle) {
    throw new Error("Election cycle not found.");
  }

  const next = nextStatus(cycle.status);
  if (!next) {
    throw new Error("Election cycle is already in final status.");
  }

  if (next === "results_published") {
    const turnout = await getElectionTurnoutStats(cycleId);
    if (!input?.publishDespiteQuorum && turnout.turnoutPercent < cycle.quorumPercent) {
      throw new Error(
        `Quorum not met: turnout is ${turnout.turnoutPercent}%, quorum is ${cycle.quorumPercent}%.`,
      );
    }
  }

  await db
    .update(electionCycles)
    .set({
      status: next,
      resultsPublished: next === "results_published" ? true : cycle.resultsPublished,
      updatedAt: new Date(),
    })
    .where(eq(electionCycles.id, cycleId));

  if (next === "nominations_open" || next === "voting_open" || next === "results_published") {
    const recipients = await db
      .select({ userId: alumniProfiles.userId })
      .from(alumniProfiles)
      .where(eq(alumniProfiles.verificationStatus, "verified"));
    const userIds = recipients.map((row) => row.userId);
    if (userIds.length > 0) {
      if (next === "nominations_open") {
        await createNotificationsForUsers({
          userIds,
          type: "voting_open",
          title: "Nominations are now open",
          body: `${cycle.title} is now open for nominations.`,
          actionUrl: `/voting/elections/${cycle.id}`,
          idempotencyKeyPrefix: `nominations_open:${cycle.id}`,
        });
      } else if (next === "voting_open") {
        await createNotificationsForUsers({
          userIds,
          type: "voting_open",
          title: "Voting is now open",
          body: `${cycle.title} is now open for voting.`,
          actionUrl: `/voting/elections/${cycle.id}`,
          idempotencyKeyPrefix: `voting_open:${cycle.id}`,
        });
      } else {
        await createNotificationsForUsers({
          userIds,
          type: "results_published",
          title: "Election results published",
          body: `${cycle.title} results are now available.`,
          actionUrl: `/voting/results/${cycle.id}`,
          idempotencyKeyPrefix: `results_published:${cycle.id}`,
        });
      }
    }
  }
}

export async function listNominationsForAdmin(filters: {
  cycleId?: string | null;
  positionId?: string | null;
  status?: "pending" | "approved" | "rejected" | "withdrawn" | null;
}) {
  const clauses = [];
  if (filters.cycleId) clauses.push(eq(nominations.electionCycleId, filters.cycleId));
  if (filters.positionId) clauses.push(eq(nominations.positionId, filters.positionId));
  if (filters.status) clauses.push(eq(nominations.status, filters.status));

  return db
    .select({
      nominationId: nominations.id,
      cycleId: nominations.electionCycleId,
      positionId: nominations.positionId,
      nomineeId: nominations.nomineeId,
      nomineeName: users.name,
      nominatedById: nominations.nominatedById,
      status: nominations.status,
      manifesto: nominations.manifesto,
      createdAt: nominations.createdAt,
      reviewNote: nominations.reviewNote,
      positionTitle: electionPositions.title,
    })
    .from(nominations)
    .innerJoin(users, eq(users.id, nominations.nomineeId))
    .innerJoin(electionPositions, eq(electionPositions.id, nominations.positionId))
    .where(clauses.length > 0 ? and(...clauses) : undefined)
    .orderBy(desc(nominations.createdAt));
}

export async function reviewNomination(input: {
  nominationId: string;
  status: "approved" | "rejected";
  reviewerId: string;
  reviewNote?: string | null;
}) {
  const nomination = await db
    .select({
      id: nominations.id,
      cycleId: nominations.electionCycleId,
      nomineeId: nominations.nomineeId,
      nomineeEmail: users.email,
      nomineeName: users.name,
      positionTitle: electionPositions.title,
    })
    .from(nominations)
    .innerJoin(users, eq(users.id, nominations.nomineeId))
    .innerJoin(electionPositions, eq(electionPositions.id, nominations.positionId))
    .where(eq(nominations.id, input.nominationId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  await db
    .update(nominations)
    .set({
      status: input.status,
      reviewedBy: input.reviewerId,
      reviewedAt: new Date(),
      reviewNote: input.reviewNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(nominations.id, input.nominationId));

  if (nomination) {
    await createNotificationsForUsers({
      userIds: [nomination.nomineeId],
      type: input.status === "approved" ? "nomination_submitted" : "peer_nomination_received",
      title:
        input.status === "approved"
          ? `Nomination approved for ${nomination.positionTitle}`
          : `Nomination rejected for ${nomination.positionTitle}`,
      body:
        input.status === "approved"
          ? "Your nomination has been approved."
          : input.reviewNote?.trim() || "Your nomination was not approved.",
      actionUrl: `/voting/elections/${nomination.cycleId}`,
      idempotencyKeyPrefix: `nomination_review:${nomination.id}:${input.status}`,
    });

    await sendEmail({
      to: nomination.nomineeEmail,
      subject:
        input.status === "approved"
          ? `Nomination approved — ${nomination.positionTitle}`
          : `Nomination update — ${nomination.positionTitle}`,
      react: createElement("div", null, [
        createElement(
          "p",
          { key: "line1" },
          `Hello ${nomination.nomineeName}, your nomination for ${nomination.positionTitle} has been ${input.status}.`,
        ),
        input.reviewNote
          ? createElement("p", { key: "line2" }, `Review note: ${input.reviewNote}`)
          : createElement("p", { key: "line2" }, "Please check the voting portal for more details."),
      ]),
      text: `Your nomination for ${nomination.positionTitle} has been ${input.status}. ${
        input.reviewNote ? `Review note: ${input.reviewNote}` : ""
      }`,
    });
  }
}

export async function bulkApproveNominations(nominationIds: string[], reviewerId: string) {
  if (nominationIds.length === 0) return;
  await db
    .update(nominations)
    .set({
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(inArray(nominations.id, nominationIds));

  const approvedRows = await db
    .select({
      nominationId: nominations.id,
      cycleId: nominations.electionCycleId,
      nomineeId: nominations.nomineeId,
      nomineeEmail: users.email,
      nomineeName: users.name,
      positionTitle: electionPositions.title,
    })
    .from(nominations)
    .innerJoin(users, eq(users.id, nominations.nomineeId))
    .innerJoin(electionPositions, eq(electionPositions.id, nominations.positionId))
    .where(inArray(nominations.id, nominationIds));

  await createNotificationsForUsers({
    userIds: approvedRows.map((row) => row.nomineeId),
    type: "nomination_submitted",
    title: "Nomination approved",
    body: "Your nomination has been approved.",
    actionUrl: null,
    idempotencyKeyPrefix: `bulk_nomination_approved:${reviewerId}:${Date.now()}`,
  });

  for (const row of approvedRows) {
    await sendEmail({
      to: row.nomineeEmail,
      subject: `Nomination approved — ${row.positionTitle}`,
      react: createElement("div", null, [
        createElement(
          "p",
          { key: "line1" },
          `Hello ${row.nomineeName}, your nomination for ${row.positionTitle} has been approved.`,
        ),
      ]),
      text: `Your nomination for ${row.positionTitle} has been approved.`,
    });
  }
}

export async function getElectionResultsForAdmin(cycleId: string) {
  const rows = await db.execute<{
    positionId: string;
    positionTitle: string;
    nomineeName: string;
    voteCount: number;
    percentage: number;
  }>(sql`
    with totals as (
      select
        ev.position_id,
        count(ev.id)::int as total_votes
      from election_votes ev
      where ev.election_cycle_id = ${cycleId}
      group by ev.position_id
    )
    select
      ep.id as "positionId",
      ep.title as "positionTitle",
      coalesce(ap.first_name || ' ' || ap.last_name, u.name) as "nomineeName",
      count(ev.id)::int as "voteCount",
      case
        when coalesce(t.total_votes, 0) = 0 then 0
        else round((count(ev.id)::numeric / t.total_votes::numeric) * 100, 2)
      end::float8 as percentage
    from election_votes ev
    inner join election_positions ep on ep.id = ev.position_id
    inner join nominations n on n.id = ev.nominee_id
    inner join users u on u.id = n.nominee_id
    left join alumni_profiles ap on ap.user_id = u.id
    left join totals t on t.position_id = ep.id
    where ev.election_cycle_id = ${cycleId}
    group by ep.id, ep.title, ap.first_name, ap.last_name, u.name, t.total_votes
    order by ep.title asc, "voteCount" desc, "nomineeName" asc
  `);
  return rows.rows;
}
