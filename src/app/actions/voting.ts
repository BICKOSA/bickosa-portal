"use server";

import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { createElement } from "react";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  consentLogs,
  electionCycles,
  electionPositions,
  electionVotes,
  generalPolls,
  nominations,
  pollVotes,
  users,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/resend";
import { createNotification, createNotificationsForUsers } from "@/lib/notifications/create-notification";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const selfNominationSchema = z.object({
  positionId: z.string().uuid(),
  manifesto: z.string().trim().min(100).max(1000),
});

const peerNominationSchema = z.object({
  positionId: z.string().uuid(),
  nomineeId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

const acceptNominationSchema = z.object({
  nominationId: z.string().uuid(),
  manifesto: z.string().trim().min(100).max(1000).optional(),
});

const withdrawNominationSchema = z.object({
  nominationId: z.string().uuid(),
});

const submitVotesSchema = z.object({
  cycleId: z.string().uuid(),
  votes: z
    .array(
      z.object({
        positionId: z.string().uuid(),
        nomineeId: z.string().uuid(),
      }),
    )
    .max(50),
});

const submitPollVoteSchema = z.object({
  pollId: z.string().uuid(),
  choice: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)]),
});

async function getSessionUser() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

async function getVerifiedMemberState(userId: string): Promise<boolean> {
  const profile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, userId),
    columns: { verificationStatus: true },
  });
  return profile?.verificationStatus === "verified";
}

async function listAdminUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));
  return rows.map((row) => row.id);
}

async function listVerifiedUserIds(): Promise<string[]> {
  const rows = await db
    .select({ userId: alumniProfiles.userId })
    .from(alumniProfiles)
    .where(eq(alumniProfiles.verificationStatus, "verified"));
  return rows.map((row) => row.userId);
}

async function getPositionWithCycle(positionId: string) {
  const rows = await db
    .select({
      positionId: electionPositions.id,
      positionTitle: electionPositions.title,
      cycleId: electionCycles.id,
      cycleTitle: electionCycles.title,
      status: electionCycles.status,
      nominationOpens: electionCycles.nominationOpens,
      nominationCloses: electionCycles.nominationCloses,
      votingOpens: electionCycles.votingOpens,
      votingCloses: electionCycles.votingCloses,
    })
    .from(electionPositions)
    .innerJoin(electionCycles, eq(electionCycles.id, electionPositions.electionCycleId))
    .where(eq(electionPositions.id, positionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function submitSelfNomination(positionId: string, manifesto: string): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, message: "You must be signed in." };
  }

  const parsed = selfNominationSchema.safeParse({ positionId, manifesto });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid nomination input." };
  }

  const isVerified = await getVerifiedMemberState(session.user.id);
  if (!isVerified) {
    return { ok: false, message: "Only verified members can self-nominate." };
  }

  const position = await getPositionWithCycle(parsed.data.positionId);
  if (!position) {
    return { ok: false, message: "Position not found." };
  }

  const now = new Date();
  if (
    position.status !== "nominations_open" ||
    now < position.nominationOpens ||
    now > position.nominationCloses
  ) {
    return { ok: false, message: "Nominations are currently closed for this position." };
  }

  const [row] = await db
    .insert(nominations)
    .values({
      electionCycleId: position.cycleId,
      positionId: position.positionId,
      nomineeId: session.user.id,
      nominatedById: session.user.id,
      manifesto: parsed.data.manifesto,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [nominations.positionId, nominations.nomineeId],
    })
    .returning({ id: nominations.id });

  if (!row) {
    return { ok: false, message: "You already have a nomination for this position." };
  }

  const adminUserIds = await listAdminUserIds();
  if (adminUserIds.length > 0) {
    await createNotificationsForUsers({
      userIds: adminUserIds,
      type: "nomination_submitted",
      title: "New nomination submitted",
      body: `${session.user.name ?? "A member"} submitted a nomination for ${position.positionTitle}.`,
      actionUrl: `/voting/elections/${position.cycleId}`,
      idempotencyKeyPrefix: `nomination_submitted:${row.id}`,
    });
  }

  return { ok: true, message: "Nomination submitted for admin review." };
}

export async function submitPeerNomination(
  positionId: string,
  nomineeId: string,
  note?: string,
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, message: "You must be signed in." };
  }

  const parsed = peerNominationSchema.safeParse({ positionId, nomineeId, note });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid nomination input." };
  }

  const position = await getPositionWithCycle(parsed.data.positionId);
  if (!position) {
    return { ok: false, message: "Position not found." };
  }

  const now = new Date();
  if (
    position.status !== "nominations_open" ||
    now < position.nominationOpens ||
    now > position.nominationCloses
  ) {
    return { ok: false, message: "Nominations are currently closed for this position." };
  }

  const nominee = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.nomineeId),
    columns: { id: true, email: true, name: true },
  });
  if (!nominee) {
    return { ok: false, message: "Nominee not found." };
  }

  const [row] = await db
    .insert(nominations)
    .values({
      electionCycleId: position.cycleId,
      positionId: position.positionId,
      nomineeId: parsed.data.nomineeId,
      nominatedById: session.user.id,
      reviewNote: parsed.data.note ?? null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [nominations.positionId, nominations.nomineeId],
    })
    .returning({ id: nominations.id });

  if (!row) {
    return { ok: false, message: "This member already has a nomination for this position." };
  }

  await createNotification({
    userId: nominee.id,
    type: "peer_nomination_received",
    title: `You've been nominated for ${position.positionTitle}`,
    body: "Accept your nomination and submit your manifesto.",
    actionUrl: `/voting/elections/${position.cycleId}?nominationId=${row.id}`,
    idempotencyKey: `peer_nomination_received:${row.id}:${nominee.id}`,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.bickosa.org";
  await sendEmail({
    to: nominee.email,
    subject: `You've been nominated for ${position.positionTitle}`,
    react: (
      createElement("div", null, [
        createElement("p", { key: "greeting" }, `Hello ${nominee.name || "Member"},`),
        createElement(
          "p",
          { key: "line2" },
          `You have been nominated for ${position.positionTitle} in ${position.cycleTitle}.`,
        ),
        createElement(
          "p",
          { key: "line3" },
          `Accept your nomination and submit your manifesto here: ${appUrl}/voting/elections/${position.cycleId}?nominationId=${row.id}`,
        ),
      ])
    ),
    text: `You've been nominated for ${position.positionTitle}. Accept and submit your manifesto at ${appUrl}/voting/elections/${position.cycleId}?nominationId=${row.id}`,
  });

  return { ok: true, message: "Peer nomination submitted." };
}

export async function acceptNomination(
  nominationId: string,
  manifesto?: string,
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, message: "You must be signed in." };
  }

  const parsed = acceptNominationSchema.safeParse({ nominationId, manifesto });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid nomination input." };
  }

  const nomination = await db.query.nominations.findFirst({
    where: eq(nominations.id, parsed.data.nominationId),
  });
  if (!nomination) {
    return { ok: false, message: "Nomination not found." };
  }
  if (nomination.nomineeId !== session.user.id) {
    return { ok: false, message: "You cannot accept this nomination." };
  }

  await db
    .update(nominations)
    .set({
      manifesto: parsed.data.manifesto ?? nomination.manifesto,
      status: "pending",
      updatedAt: new Date(),
    })
    .where(eq(nominations.id, nomination.id));

  return { ok: true, message: "Nomination accepted and updated." };
}

export async function withdrawNomination(nominationId: string): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, message: "You must be signed in." };
  }

  const parsed = withdrawNominationSchema.safeParse({ nominationId });
  if (!parsed.success) {
    return { ok: false, message: "Invalid nomination id." };
  }

  const nomination = await db.query.nominations.findFirst({
    where: eq(nominations.id, parsed.data.nominationId),
  });
  if (!nomination) {
    return { ok: false, message: "Nomination not found." };
  }

  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin && nomination.nomineeId !== session.user.id) {
    return { ok: false, message: "You are not allowed to withdraw this nomination." };
  }

  await db
    .update(nominations)
    .set({
      status: "withdrawn",
      updatedAt: new Date(),
    })
    .where(eq(nominations.id, nomination.id));

  return { ok: true, message: "Nomination withdrawn." };
}

export async function submitElectionVotes(
  cycleId: string,
  votes: Array<{ positionId: string; nomineeId: string }>,
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, message: "You must be signed in." };
  }

  const parsed = submitVotesSchema.safeParse({ cycleId, votes });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid ballot submission." };
  }

  const isVerified = await getVerifiedMemberState(session.user.id);
  if (!isVerified) {
    return { ok: false, message: "Only verified members can vote in elections." };
  }

  const cycle = await db.query.electionCycles.findFirst({
    where: eq(electionCycles.id, parsed.data.cycleId),
  });
  if (!cycle) {
    return { ok: false, message: "Election cycle not found." };
  }

  const now = new Date();
  if (cycle.status !== "voting_open" || now < cycle.votingOpens || now > cycle.votingCloses) {
    return { ok: false, message: "Voting is currently closed for this election." };
  }

  const byPosition = new Map<string, string>();
  for (const vote of parsed.data.votes) {
    if (byPosition.has(vote.positionId)) {
      return { ok: false, message: "A position can only be voted once per ballot submission." };
    }
    byPosition.set(vote.positionId, vote.nomineeId);
  }

  const positionIds = Array.from(byPosition.keys());
  const nomineeNominationIds = Array.from(byPosition.values());
  if (positionIds.length === 0) {
    return { ok: false, message: "Please select at least one candidate before submitting." };
  }

  const [positions, nomineeNominations] = await Promise.all([
    db.query.electionPositions.findMany({
      where: inArray(electionPositions.id, positionIds),
      columns: { id: true, electionCycleId: true },
    }),
    db.query.nominations.findMany({
      where: inArray(nominations.id, nomineeNominationIds),
      columns: {
        id: true,
        electionCycleId: true,
        positionId: true,
        status: true,
      },
    }),
  ]);

  const validPositionIds = new Set(
    positions
      .filter((position) => position.electionCycleId === parsed.data.cycleId)
      .map((position) => position.id),
  );
  if (validPositionIds.size !== positionIds.length) {
    return { ok: false, message: "One or more selected positions are invalid for this cycle." };
  }

  const nominationsById = new Map(nomineeNominations.map((nomination) => [nomination.id, nomination]));
  for (const [positionId, nominationId] of byPosition.entries()) {
    const nomination = nominationsById.get(nominationId);
    if (
      !nomination ||
      nomination.electionCycleId !== parsed.data.cycleId ||
      nomination.positionId !== positionId ||
      nomination.status !== "approved"
    ) {
      return { ok: false, message: "One or more selected candidates are not valid for this ballot." };
    }
  }

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ positionId: electionVotes.positionId })
        .from(electionVotes)
        .where(
          and(
            eq(electionVotes.electionCycleId, parsed.data.cycleId),
            eq(electionVotes.voterId, session.user.id),
            inArray(electionVotes.positionId, positionIds),
          ),
        );
      if (existing.length > 0) {
        throw new Error("You have already voted for one or more selected positions.");
      }

      await tx.insert(electionVotes).values(
        Array.from(byPosition.entries()).map(([positionId, nominationId]) => ({
          electionCycleId: parsed.data.cycleId,
          positionId,
          voterId: session.user.id,
          nomineeId: nominationId,
          castAt: now,
        })),
      );

      await tx.insert(consentLogs).values({
        userId: session.user.id,
        consentType: "data_processing",
        granted: true,
        action: "cast_vote",
        resourceType: "election_cycle",
        resourceId: parsed.data.cycleId,
        createdAt: now,
      });
    });
  } catch (error) {
    if (error instanceof Error && /already voted|unique|duplicate/i.test(error.message)) {
      return { ok: false, message: "Your ballot was already submitted for one or more positions." };
    }
    throw error;
  }

  return { ok: true, message: "Your ballot has been recorded." };
}

export async function submitPollVote(
  pollId: string,
  choice: string | string[],
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, message: "You must be signed in." };
  }

  const parsed = submitPollVoteSchema.safeParse({ pollId, choice });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid poll vote input." };
  }

  const poll = await db.query.generalPolls.findFirst({
    where: eq(generalPolls.id, parsed.data.pollId),
  });
  if (!poll) {
    return { ok: false, message: "Poll not found." };
  }

  const now = new Date();
  if (poll.status !== "open" || now < poll.votingOpens || now > poll.votingCloses) {
    return { ok: false, message: "This poll is not currently accepting votes." };
  }

  const viewerProfile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, session.user.id),
    columns: {
      chapterId: true,
      verificationStatus: true,
    },
  });
  const isVerified = viewerProfile?.verificationStatus === "verified";

  if (poll.targetAudience === "verified_only" && !isVerified) {
    return { ok: false, message: "Only verified members can vote in this poll." };
  }
  if (poll.targetAudience === "chapter" && poll.chapterId !== viewerProfile?.chapterId) {
    return { ok: false, message: "This poll is limited to a specific chapter audience." };
  }

  try {
    await db.insert(pollVotes).values({
      pollId: poll.id,
      voterId: session.user.id,
      choice: parsed.data.choice,
      castAt: now,
    });
    await db.insert(consentLogs).values({
      userId: session.user.id,
      consentType: "data_processing",
      granted: true,
      action: "cast_vote",
      resourceType: "general_poll",
      resourceId: poll.id,
      createdAt: now,
    });
  } catch (error) {
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      return { ok: false, message: "You have already voted on this poll." };
    }
    throw error;
  }

  return { ok: true, message: "Your poll vote has been submitted." };
}

export async function broadcastVotingWindowOpen(cycleId: string): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return { ok: false, message: "Only admins can send broadcasts." };
  }

  const cycle = await db.query.electionCycles.findFirst({
    where: eq(electionCycles.id, cycleId),
    columns: { id: true, title: true },
  });
  if (!cycle) {
    return { ok: false, message: "Election cycle not found." };
  }

  const recipients = await listVerifiedUserIds();
  await createNotificationsForUsers({
    userIds: recipients,
    type: "voting_open",
    title: "Voting is now open",
    body: `${cycle.title} is now open for voting.`,
    actionUrl: `/voting/elections/${cycle.id}`,
    idempotencyKeyPrefix: `voting_open:${cycle.id}`,
  });

  return { ok: true, message: "Voting-open broadcast sent." };
}

export async function broadcastPollOpen(pollId: string): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return { ok: false, message: "Only admins can send broadcasts." };
  }

  const poll = await db.query.generalPolls.findFirst({
    where: eq(generalPolls.id, pollId),
    columns: { id: true, title: true },
  });
  if (!poll) {
    return { ok: false, message: "Poll not found." };
  }

  const recipients = await listVerifiedUserIds();
  await createNotificationsForUsers({
    userIds: recipients,
    type: "poll_open",
    title: "A new poll is open",
    body: poll.title,
    actionUrl: `/voting/polls/${poll.id}`,
    idempotencyKeyPrefix: `poll_open:${poll.id}`,
  });

  return { ok: true, message: "Poll-open broadcast sent." };
}

export async function broadcastResultsPublished(cycleId: string): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return { ok: false, message: "Only admins can send broadcasts." };
  }

  const cycle = await db.query.electionCycles.findFirst({
    where: eq(electionCycles.id, cycleId),
    columns: { id: true, title: true },
  });
  if (!cycle) {
    return { ok: false, message: "Election cycle not found." };
  }

  const recipients = await listVerifiedUserIds();
  await createNotificationsForUsers({
    userIds: recipients,
    type: "results_published",
    title: "Election results published",
    body: `${cycle.title} results are now available.`,
    actionUrl: `/voting/results/${cycle.id}`,
    idempotencyKeyPrefix: `results_published:${cycle.id}`,
  });

  return { ok: true, message: "Results-published broadcast sent." };
}
