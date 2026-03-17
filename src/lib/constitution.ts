import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  notInArray,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  agmPetitions,
  alumniProfiles,
  amendmentComments,
  amendmentProposals,
  committeeMembers,
  committees,
  constitutionVersions,
  events,
  users,
} from "@/lib/db/schema";

export type AmendmentStatus =
  | "draft"
  | "open_for_comment"
  | "under_review"
  | "petition_raised"
  | "approved"
  | "deferred";

export async function getViewerIsVerified(userId: string, emailVerified: boolean): Promise<boolean> {
  if (emailVerified) return true;
  const profile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, userId),
    columns: { verificationStatus: true },
  });
  return profile?.verificationStatus === "verified";
}

export async function isConstitutionCommitteeMember(userId: string): Promise<boolean> {
  const membership = await db
    .select({ id: committeeMembers.id })
    .from(committeeMembers)
    .innerJoin(committees, eq(committees.id, committeeMembers.committeeId))
    .where(
      and(
        eq(committeeMembers.userId, userId),
        ilike(committees.name, "%constitution%"),
        inArray(committees.status, ["nominations_closed", "active"]),
      ),
    )
    .limit(1);
  return membership.length > 0;
}

export async function listConstitutionHubData() {
  const [currentVersion, previousVersions, openProposals, petitionRows] = await Promise.all([
    db.query.constitutionVersions.findFirst({
      where: eq(constitutionVersions.isCurrent, true),
      orderBy: [desc(constitutionVersions.effectiveDate), desc(constitutionVersions.createdAt)],
    }),
    db
      .select()
      .from(constitutionVersions)
      .where(eq(constitutionVersions.isCurrent, false))
      .orderBy(desc(constitutionVersions.effectiveDate), desc(constitutionVersions.createdAt)),
    db
      .select({
        id: amendmentProposals.id,
        clauseReference: amendmentProposals.clauseReference,
        currentText: amendmentProposals.currentText,
        proposedText: amendmentProposals.proposedText,
        rationale: amendmentProposals.rationale,
        commentClosesAt: amendmentProposals.commentClosesAt,
        createdAt: amendmentProposals.createdAt,
        commentCount: count(amendmentComments.id),
      })
      .from(amendmentProposals)
      .leftJoin(
        amendmentComments,
        eq(amendmentComments.amendmentProposalId, amendmentProposals.id),
      )
      .where(eq(amendmentProposals.status, "open_for_comment"))
      .groupBy(
        amendmentProposals.id,
        amendmentProposals.clauseReference,
        amendmentProposals.currentText,
        amendmentProposals.proposedText,
        amendmentProposals.rationale,
        amendmentProposals.commentClosesAt,
        amendmentProposals.createdAt,
      )
      .orderBy(desc(amendmentProposals.createdAt)),
    db
      .select({
        petitionId: agmPetitions.id,
        outcome: agmPetitions.outcome,
        votedAt: agmPetitions.votedAt,
        proposalId: amendmentProposals.id,
        clauseReference: amendmentProposals.clauseReference,
        eventTitle: events.title,
        eventStartAt: events.startAt,
      })
      .from(agmPetitions)
      .leftJoin(
        amendmentProposals,
        eq(amendmentProposals.id, agmPetitions.amendmentProposalId),
      )
      .leftJoin(events, eq(events.id, agmPetitions.agmEventId))
      .where(sql`${agmPetitions.outcome} is not null`)
      .orderBy(desc(agmPetitions.votedAt), desc(events.startAt)),
  ]);

  return {
    currentVersion,
    previousVersions,
    openProposals,
    petitionRows,
  };
}

export async function getAmendmentProposalDetail(proposalId: string) {
  const proposal = await db
    .select({
      id: amendmentProposals.id,
      status: amendmentProposals.status,
      clauseReference: amendmentProposals.clauseReference,
      currentText: amendmentProposals.currentText,
      proposedText: amendmentProposals.proposedText,
      rationale: amendmentProposals.rationale,
      commentClosesAt: amendmentProposals.commentClosesAt,
      createdAt: amendmentProposals.createdAt,
      updatedAt: amendmentProposals.updatedAt,
      constitutionVersionTag: constitutionVersions.versionTag,
      proposedByName: users.name,
    })
    .from(amendmentProposals)
    .leftJoin(
      constitutionVersions,
      eq(constitutionVersions.id, amendmentProposals.constitutionVersionId),
    )
    .leftJoin(users, eq(users.id, amendmentProposals.proposedBy))
    .where(eq(amendmentProposals.id, proposalId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proposal) {
    return null;
  }

  const comments = await db
    .select({
      id: amendmentComments.id,
      authorId: amendmentComments.authorId,
      authorName: users.name,
      comment: amendmentComments.comment,
      createdAt: amendmentComments.createdAt,
    })
    .from(amendmentComments)
    .innerJoin(users, eq(users.id, amendmentComments.authorId))
    .where(eq(amendmentComments.amendmentProposalId, proposalId))
    .orderBy(asc(amendmentComments.createdAt));

  return { proposal, comments };
}

export async function listConstitutionVersionsForAdmin() {
  return db
    .select()
    .from(constitutionVersions)
    .orderBy(desc(constitutionVersions.effectiveDate), desc(constitutionVersions.createdAt));
}

export async function listAmendmentProposalsForAdmin() {
  return db
    .select({
      id: amendmentProposals.id,
      clauseReference: amendmentProposals.clauseReference,
      status: amendmentProposals.status,
      commentClosesAt: amendmentProposals.commentClosesAt,
      createdAt: amendmentProposals.createdAt,
      updatedAt: amendmentProposals.updatedAt,
      rationale: amendmentProposals.rationale,
      versionTag: constitutionVersions.versionTag,
      proposedByName: users.name,
      commentCount: count(amendmentComments.id),
    })
    .from(amendmentProposals)
    .leftJoin(
      constitutionVersions,
      eq(constitutionVersions.id, amendmentProposals.constitutionVersionId),
    )
    .leftJoin(users, eq(users.id, amendmentProposals.proposedBy))
    .leftJoin(
      amendmentComments,
      eq(amendmentComments.amendmentProposalId, amendmentProposals.id),
    )
    .groupBy(
      amendmentProposals.id,
      amendmentProposals.clauseReference,
      amendmentProposals.status,
      amendmentProposals.commentClosesAt,
      amendmentProposals.createdAt,
      amendmentProposals.updatedAt,
      amendmentProposals.rationale,
      constitutionVersions.versionTag,
      users.name,
    )
    .orderBy(desc(amendmentProposals.createdAt));
}

export async function listAgmPetitionsForAdmin() {
  return db
    .select({
      id: agmPetitions.id,
      agmEventId: agmPetitions.agmEventId,
      amendmentProposalId: agmPetitions.amendmentProposalId,
      outcome: agmPetitions.outcome,
      outcomeNotes: agmPetitions.outcomeNotes,
      votedAt: agmPetitions.votedAt,
      createdAt: agmPetitions.createdAt,
      eventTitle: events.title,
      eventStartAt: events.startAt,
      clauseReference: amendmentProposals.clauseReference,
      proposalStatus: amendmentProposals.status,
    })
    .from(agmPetitions)
    .leftJoin(events, eq(events.id, agmPetitions.agmEventId))
    .leftJoin(
      amendmentProposals,
      eq(amendmentProposals.id, agmPetitions.amendmentProposalId),
    )
    .orderBy(desc(agmPetitions.createdAt));
}

export async function listVerifiedMemberIds(): Promise<string[]> {
  const rows = await db
    .select({ userId: alumniProfiles.userId })
    .from(alumniProfiles)
    .where(eq(alumniProfiles.verificationStatus, "verified"));
  return rows.map((row) => row.userId);
}

export async function listVerifiedMemberIdsWithoutCommentForProposal(
  proposalId: string,
): Promise<string[]> {
  const commenters = await db
    .select({ authorId: amendmentComments.authorId })
    .from(amendmentComments)
    .where(eq(amendmentComments.amendmentProposalId, proposalId));

  const commenterIds = commenters.map((row) => row.authorId);
  if (commenterIds.length === 0) {
    return listVerifiedMemberIds();
  }

  const nonCommenters = await db
    .select({ userId: alumniProfiles.userId })
    .from(alumniProfiles)
    .where(
      and(
        eq(alumniProfiles.verificationStatus, "verified"),
        notInArray(alumniProfiles.userId, commenterIds),
      ),
    );

  return nonCommenters.map((row) => row.userId);
}

export async function listUpcomingAgmEvents() {
  return db
    .select({
      id: events.id,
      title: events.title,
      startAt: events.startAt,
    })
    .from(events)
    .where(or(ilike(events.title, "%agm%"), ilike(events.description, "%agm%")))
    .orderBy(desc(events.startAt));
}

export async function scheduleConstitutionCommentDeadlineReminder(input: {
  proposalId: string;
  closesAt: Date;
}) {
  const qstashUrl = process.env.QSTASH_URL;
  const qstashToken = process.env.QSTASH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const reminderSecret = process.env.CONSTITUTION_REMINDER_SECRET;
  if (!qstashUrl || !qstashToken || !appUrl || !reminderSecret) return;

  const reminderAtMs = input.closesAt.getTime() - 48 * 60 * 60 * 1000;
  const delaySeconds = Math.floor((reminderAtMs - Date.now()) / 1000);
  if (delaySeconds <= 0) return;

  const targetUrl = `${appUrl.replace(/\/$/, "")}/api/constitution/reminders/comment-deadline`;
  const publishUrl = `${qstashUrl.replace(/\/$/, "")}/v2/publish/${encodeURIComponent(targetUrl)}`;
  const response = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qstashToken}`,
      "Content-Type": "application/json",
      "Upstash-Delay": `${delaySeconds}s`,
      "Upstash-Method": "POST",
      "Upstash-Header-x-reminder-secret": reminderSecret,
    },
    body: JSON.stringify({ proposalId: input.proposalId }),
  });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Failed to schedule constitution reminder: ${payload}`);
  }
}
