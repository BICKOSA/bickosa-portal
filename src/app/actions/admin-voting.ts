"use server";

import { z } from "zod";

import {
  advanceElectionCycleStatus,
  bulkApproveNominations,
  createElectionCycle,
  createElectionPosition,
  deleteElectionPosition,
  reorderElectionPositions,
  reviewNomination,
  updateElectionPosition,
} from "@/lib/admin-elections";
import {
  createPoll,
  togglePollResultsPublished,
  updatePollStatus,
} from "@/lib/admin-polls";
import { requireAdminPageSession } from "@/lib/admin-auth";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const cycleSchema = z
  .object({
    title: z.string().trim().min(3),
    description: z.string().trim().max(1000).nullable(),
    nominationOpens: z.coerce.date(),
    nominationCloses: z.coerce.date(),
    votingOpens: z.coerce.date(),
    votingCloses: z.coerce.date(),
    quorumPercent: z.number().int().min(1).max(100),
  })
  .refine((value) => value.nominationCloses > value.nominationOpens, "Nomination close must be after open.")
  .refine((value) => value.votingOpens > value.nominationCloses, "Voting must open after nominations close.")
  .refine((value) => value.votingCloses > value.votingOpens, "Voting close must be after open.");

export async function createElectionCycleAction(input: {
  title: string;
  description: string | null;
  nominationOpens: string;
  nominationCloses: string;
  votingOpens: string;
  votingCloses: string;
  quorumPercent: number;
}) {
  const session = await requireAdminPageSession();
  const parsed = cycleSchema.safeParse({
    ...input,
    nominationOpens: input.nominationOpens,
    nominationCloses: input.nominationCloses,
    votingOpens: input.votingOpens,
    votingCloses: input.votingCloses,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid election cycle input." };
  }

  const cycleId = await createElectionCycle({
    ...parsed.data,
    createdBy: session.user.id,
  });
  if (!cycleId) {
    return { ok: false, message: "Failed to create election cycle." };
  }
  return { ok: true, message: cycleId };
}

export async function createElectionPositionAction(input: {
  cycleId: string;
  title: string;
  description: string | null;
  maxWinners: number;
  maxNominations: number;
}): Promise<ActionResult> {
  await requireAdminPageSession();
  if (!input.title.trim()) return { ok: false, message: "Position title is required." };
  await createElectionPosition({
    cycleId: input.cycleId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    maxWinners: Math.max(1, input.maxWinners),
    maxNominations: Math.max(1, input.maxNominations),
  });
  return { ok: true, message: "Position created." };
}

export async function updateElectionPositionAction(input: {
  positionId: string;
  title: string;
  description: string | null;
  maxWinners: number;
  maxNominations: number;
}): Promise<ActionResult> {
  await requireAdminPageSession();
  await updateElectionPosition(input.positionId, {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    maxWinners: Math.max(1, input.maxWinners),
    maxNominations: Math.max(1, input.maxNominations),
  });
  return { ok: true, message: "Position updated." };
}

export async function deleteElectionPositionAction(positionId: string): Promise<ActionResult> {
  await requireAdminPageSession();
  await deleteElectionPosition(positionId);
  return { ok: true, message: "Position deleted." };
}

export async function reorderElectionPositionsAction(
  cycleId: string,
  orderedPositionIds: string[],
): Promise<ActionResult> {
  await requireAdminPageSession();
  await reorderElectionPositions(cycleId, orderedPositionIds);
  return { ok: true, message: "Position order updated." };
}

export async function advanceElectionStatusAction(input: {
  cycleId: string;
  publishDespiteQuorum?: boolean;
}): Promise<ActionResult> {
  await requireAdminPageSession();
  try {
    await advanceElectionCycleStatus(input.cycleId, {
      publishDespiteQuorum: input.publishDespiteQuorum,
    });
    return { ok: true, message: "Election status advanced." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not advance election status.",
    };
  }
}

export async function reviewNominationAction(input: {
  nominationId: string;
  status: "approved" | "rejected";
  reviewNote?: string | null;
}): Promise<ActionResult> {
  const session = await requireAdminPageSession();
  await reviewNomination({
    nominationId: input.nominationId,
    status: input.status,
    reviewerId: session.user.id,
    reviewNote: input.reviewNote ?? null,
  });
  return { ok: true, message: "Nomination review saved." };
}

export async function bulkApproveNominationsAction(nominationIds: string[]): Promise<ActionResult> {
  const session = await requireAdminPageSession();
  await bulkApproveNominations(nominationIds, session.user.id);
  return { ok: true, message: "Nominations approved." };
}

export async function createPollAction(input: {
  title: string;
  description: string | null;
  pollType: "yes_no_abstain" | "multiple_choice" | "ranked_choice";
  options: string[];
  votingOpens: string;
  votingCloses: string;
  quorumPercent: number;
  targetAudience: "all_members" | "verified_only" | "chapter";
  chapterId: string | null;
  isAnonymous: boolean;
}): Promise<ActionResult> {
  const session = await requireAdminPageSession();
  await createPoll({
    title: input.title.trim(),
    description: input.description?.trim() || null,
    pollType: input.pollType,
    options:
      input.pollType === "yes_no_abstain"
        ? null
        : input.options.map((option) => option.trim()).filter((option) => option.length > 0),
    votingOpens: new Date(input.votingOpens),
    votingCloses: new Date(input.votingCloses),
    quorumPercent: Math.max(1, Math.min(100, input.quorumPercent)),
    targetAudience: input.targetAudience,
    chapterId: input.chapterId,
    isAnonymous: input.isAnonymous,
    createdBy: session.user.id,
  });
  return { ok: true, message: "Poll created." };
}

export async function setPollStatusAction(input: {
  pollId: string;
  status: "draft" | "open" | "closed" | "results_published";
}): Promise<ActionResult> {
  await requireAdminPageSession();
  await updatePollStatus(input.pollId, input.status);
  return { ok: true, message: "Poll status updated." };
}

export async function togglePollPublishAction(
  pollId: string,
  published: boolean,
): Promise<ActionResult> {
  await requireAdminPageSession();
  await togglePollResultsPublished(pollId, published);
  return { ok: true, message: published ? "Results published." : "Results unpublished." };
}
