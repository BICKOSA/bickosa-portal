"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import { isAdminUserRole } from "@/lib/auth/roles";
import {
  getViewerIsVerified,
  isConstitutionCommitteeMember,
  listVerifiedMemberIds,
  listVerifiedMemberIdsWithoutCommentForProposal,
  scheduleConstitutionCommentDeadlineReminder,
  type AmendmentStatus,
} from "@/lib/constitution";
import { db } from "@/lib/db";
import {
  agmPetitions,
  amendmentComments,
  amendmentProposals,
  constitutionVersions,
} from "@/lib/db/schema";
import { createNotificationsForUsers } from "@/lib/notifications/create-notification";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const commentSchema = z.object({
  proposalId: z.string().uuid(),
  comment: z.string().trim().min(10).max(4000),
});

const createProposalSchema = z.object({
  constitutionVersionId: z.string().uuid(),
  clauseReference: z.string().trim().min(2).max(255),
  currentText: z.string().trim().min(3),
  proposedText: z.string().trim().min(3),
  rationale: z.string().trim().min(20).max(5000),
  commentClosesAt: z.string().datetime().optional(),
});

const createVersionSchema = z.object({
  versionTag: z.string().trim().min(2).max(80),
  effectiveDate: z.string().date(),
  documentUrl: z.string().url(),
  notes: z.string().trim().max(5000).optional(),
  setCurrent: z.boolean(),
});

async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function submitAmendmentComment(
  proposalId: string,
  comment: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "You must be signed in." };

  const parsed = commentSchema.safeParse({ proposalId, comment });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }

  const isVerified = await getViewerIsVerified(session.user.id, Boolean(session.user.emailVerified));
  if (!isVerified) {
    return { ok: false, message: "Only verified members can comment on amendments." };
  }

  const proposal = await db.query.amendmentProposals.findFirst({
    where: eq(amendmentProposals.id, parsed.data.proposalId),
  });
  if (!proposal) return { ok: false, message: "Amendment proposal not found." };
  if (proposal.status !== "open_for_comment") {
    return { ok: false, message: "This proposal is not currently open for comments." };
  }
  if (proposal.commentClosesAt && new Date() > proposal.commentClosesAt) {
    return { ok: false, message: "The comment window has closed." };
  }

  await db.insert(amendmentComments).values({
    amendmentProposalId: proposal.id,
    authorId: session.user.id,
    comment: parsed.data.comment,
    createdAt: new Date(),
  });

  revalidatePath("/constitution");
  revalidatePath(`/constitution/amendments/${proposal.id}`);
  revalidatePath("/admin/constitution");
  return { ok: true, message: "Comment submitted." };
}

export async function createAmendmentProposal(input: {
  constitutionVersionId: string;
  clauseReference: string;
  currentText: string;
  proposedText: string;
  rationale: string;
  commentClosesAt?: string;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "You must be signed in." };

  const parsed = createProposalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid proposal input." };
  }

  const canCreate = await isConstitutionCommitteeMember(session.user.id);
  if (!canCreate) {
    return {
      ok: false,
      message: "Only Constitution Review Committee members can create amendment proposals.",
    };
  }

  const version = await db.query.constitutionVersions.findFirst({
    where: eq(constitutionVersions.id, parsed.data.constitutionVersionId),
    columns: { id: true },
  });
  if (!version) return { ok: false, message: "Constitution version not found." };

  await db.insert(amendmentProposals).values({
    constitutionVersionId: parsed.data.constitutionVersionId,
    proposedBy: session.user.id,
    clauseReference: parsed.data.clauseReference,
    currentText: parsed.data.currentText,
    proposedText: parsed.data.proposedText,
    rationale: parsed.data.rationale,
    status: "draft",
    commentClosesAt: parsed.data.commentClosesAt ? new Date(parsed.data.commentClosesAt) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath("/admin/constitution");
  return { ok: true, message: "Amendment proposal created in draft state." };
}

function getAllowedNextStatuses(current: AmendmentStatus): AmendmentStatus[] {
  if (current === "draft") return ["open_for_comment"];
  if (current === "open_for_comment") return ["under_review"];
  if (current === "under_review") return ["petition_raised"];
  if (current === "petition_raised") return ["approved", "deferred"];
  return [];
}

export async function advanceProposalStatus(
  proposalId: string,
  newStatus: AmendmentStatus,
  agmEventId?: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can advance amendment proposal status." };
  }

  const proposal = await db.query.amendmentProposals.findFirst({
    where: eq(amendmentProposals.id, proposalId),
  });
  if (!proposal) return { ok: false, message: "Proposal not found." };

  if (!getAllowedNextStatuses(proposal.status).includes(newStatus)) {
    return { ok: false, message: `Invalid status transition from ${proposal.status} to ${newStatus}.` };
  }

  if (newStatus === "petition_raised" && !agmEventId) {
    return { ok: false, message: "An AGM event must be selected when raising a petition." };
  }

  await db
    .update(amendmentProposals)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(amendmentProposals.id, proposal.id));

  if (newStatus === "open_for_comment") {
    const recipients = await listVerifiedMemberIds();
    const closesAt = proposal.commentClosesAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createNotificationsForUsers({
      userIds: recipients,
      type: "constitution_amendment_open_for_comment",
      title: "Constitution amendment open for comment",
      body: `A proposed change to the BICKOSA Constitution is open for your input. Comments close on ${closesAt.toDateString()}.`,
      actionUrl: `/constitution/amendments/${proposal.id}`,
      idempotencyKeyPrefix: `constitution_amendment_open:${proposal.id}`,
    });

    try {
      await scheduleConstitutionCommentDeadlineReminder({
        proposalId: proposal.id,
        closesAt,
      });
    } catch (error) {
      console.error("Failed to schedule constitution reminder", error);
    }
  }

  if (newStatus === "petition_raised" && agmEventId) {
    await db.insert(agmPetitions).values({
      agmEventId,
      amendmentProposalId: proposal.id,
      recordedBy: session.user.id,
      createdAt: new Date(),
    });
  }

  revalidatePath("/constitution");
  revalidatePath(`/constitution/amendments/${proposal.id}`);
  revalidatePath("/admin/constitution");
  return { ok: true, message: "Proposal status advanced." };
}

export async function recordAGMOutcome(
  petitionId: string,
  outcome: "approved" | "deferred" | "withdrawn",
  notes?: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can record AGM outcomes." };
  }

  const petition = await db.query.agmPetitions.findFirst({
    where: eq(agmPetitions.id, petitionId),
  });
  if (!petition || !petition.amendmentProposalId) {
    return { ok: false, message: "Petition not found." };
  }
  const amendmentProposalId = petition.amendmentProposalId;

  await db.transaction(async (tx) => {
    await tx
      .update(agmPetitions)
      .set({
        outcome,
        outcomeNotes: notes?.trim() || null,
        votedAt: new Date(),
        recordedBy: session.user.id,
      })
      .where(eq(agmPetitions.id, petition.id));

    await tx
      .update(amendmentProposals)
      .set({
        status: outcome === "approved" ? "approved" : "deferred",
        updatedAt: new Date(),
      })
      .where(eq(amendmentProposals.id, amendmentProposalId));
  });

  const recipients = await listVerifiedMemberIds();
  await createNotificationsForUsers({
    userIds: recipients,
    type: "constitution_outcome_recorded",
    title: "Constitution amendment outcome recorded",
    body: `An AGM outcome has been recorded: ${outcome}.`,
    actionUrl: `/constitution/amendments/${amendmentProposalId}`,
    idempotencyKeyPrefix: `constitution_outcome:${petition.id}:${outcome}`,
  });

  revalidatePath("/constitution");
  revalidatePath(`/constitution/amendments/${amendmentProposalId}`);
  revalidatePath("/admin/constitution");
  return { ok: true, message: "AGM outcome recorded." };
}

export async function createConstitutionVersionAction(input: {
  versionTag: string;
  effectiveDate: string;
  documentUrl: string;
  notes?: string;
  setCurrent: boolean;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can create constitution versions." };
  }

  const parsed = createVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid constitution version." };
  }

  await db.transaction(async (tx) => {
    if (parsed.data.setCurrent) {
      await tx.update(constitutionVersions).set({ isCurrent: false }).where(eq(constitutionVersions.isCurrent, true));
    }

    await tx.insert(constitutionVersions).values({
      versionTag: parsed.data.versionTag,
      effectiveDate: parsed.data.effectiveDate,
      documentUrl: parsed.data.documentUrl,
      notes: parsed.data.notes?.trim() || null,
      isCurrent: parsed.data.setCurrent,
      publishedBy: session.user.id,
      createdAt: new Date(),
    });
  });

  revalidatePath("/constitution");
  revalidatePath("/admin/constitution");
  return { ok: true, message: "Constitution version created." };
}

export async function setCurrentConstitutionVersionAction(versionId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can set current constitution version." };
  }

  const version = await db.query.constitutionVersions.findFirst({
    where: eq(constitutionVersions.id, versionId),
    columns: { id: true },
  });
  if (!version) return { ok: false, message: "Constitution version not found." };

  await db.transaction(async (tx) => {
    await tx.update(constitutionVersions).set({ isCurrent: false }).where(eq(constitutionVersions.isCurrent, true));
    await tx
      .update(constitutionVersions)
      .set({ isCurrent: true })
      .where(eq(constitutionVersions.id, version.id));
  });

  revalidatePath("/constitution");
  revalidatePath("/admin/constitution");
  return { ok: true, message: "Current constitution version updated." };
}

export async function sendCommentDeadlineReminderNow(proposalId: string): Promise<ActionResult> {
  const proposal = await db.query.amendmentProposals.findFirst({
    where: and(eq(amendmentProposals.id, proposalId), eq(amendmentProposals.status, "open_for_comment")),
  });
  if (!proposal) {
    return { ok: false, message: "Proposal not available for reminders." };
  }

  const recipients = await listVerifiedMemberIdsWithoutCommentForProposal(proposal.id);
  if (recipients.length === 0) {
    return { ok: true, message: "No reminder recipients." };
  }

  await createNotificationsForUsers({
    userIds: recipients,
    type: "constitution_comment_deadline_reminder",
    title: "Comment deadline approaching",
    body: "The comment window for a constitution amendment closes in approximately 48 hours.",
    actionUrl: `/constitution/amendments/${proposal.id}`,
    idempotencyKeyPrefix: `constitution_comment_deadline:${proposal.id}`,
  });
  return { ok: true, message: "Reminders sent." };
}
