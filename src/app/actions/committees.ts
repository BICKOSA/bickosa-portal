"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createElement } from "react";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import { isAdminUserRole } from "@/lib/auth/roles";
import {
  getCommitteeNominationById,
  getUserVerifiedMemberState,
  listAdminUserIdsForCommitteeNotifications,
  logCommitteeNominationStatusChange,
} from "@/lib/committees";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  committeeMembers,
  committeeNominations,
  committees,
  consentLogs,
  users,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/resend";
import {
  createNotification,
  createNotificationsForUsers,
} from "@/lib/notifications/create-notification";

type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const nominationSchema = z.object({
  committeeId: z.string().uuid(),
  reason: z.string().trim().min(50).max(500),
});

const peerNominationSchema = nominationSchema.extend({
  nomineeId: z.string().uuid(),
});

const responseNoteSchema = z
  .string()
  .trim()
  .max(500, "Response note must be 500 characters or fewer.")
  .optional();

const createCommitteeSchema = z
  .object({
    name: z.string().trim().min(3).max(180),
    purpose: z.string().trim().min(10).max(3000),
    maxMembers: z.number().int().positive().nullable(),
    nominationOpens: z.coerce.date(),
    nominationCloses: z.coerce.date(),
    status: z.enum(["draft", "nominations_open"]),
  })
  .refine((value) => value.nominationCloses > value.nominationOpens, {
    message: "Nomination close must be after nomination open.",
    path: ["nominationCloses"],
  });

const updateCommitteeSchema = createCommitteeSchema
  .omit({ status: true })
  .extend({
    committeeId: z.string().uuid(),
  });

const updateCommitteeStatusSchema = z.object({
  committeeId: z.string().uuid(),
  nextStatus: z.enum([
    "draft",
    "nominations_open",
    "nominations_closed",
    "active",
    "dissolved",
  ]),
});

async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

async function requireAuthedMember() {
  const session = await getSession();
  if (!session) {
    return {
      error: { ok: false, message: "You must be signed in." } as const,
      session: null,
    };
  }

  const isVerified = await getUserVerifiedMemberState(
    session.user.id,
    Boolean(session.user.emailVerified),
  );
  if (!isVerified) {
    return {
      error: {
        ok: false,
        message: "Only verified members can submit committee nominations.",
      } as const,
      session: null,
    };
  }

  return { error: null, session };
}

function getCommitteeResponseUrl(committeeId: string, nominationId: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.bickosa.org";
  return `${appUrl.replace(/\/$/, "")}/committees/${committeeId}/respond/${nominationId}`;
}

async function sendNominationRequestEmail(input: {
  nominationId: string;
  committeeId: string;
  committeeName: string;
  committeePurpose: string;
  nomineeEmail: string;
  nomineeName: string;
  nominatedByName: string;
}) {
  const responseUrl = getCommitteeResponseUrl(
    input.committeeId,
    input.nominationId,
  );
  await sendEmail({
    to: input.nomineeEmail,
    subject: `You've been nominated for the ${input.committeeName}`,
    react: createElement("div", null, [
      createElement(
        "p",
        { key: "greeting" },
        `Hello ${input.nomineeName || "Member"},`,
      ),
      createElement(
        "p",
        { key: "line1" },
        `${input.nominatedByName} nominated you to join the ${input.committeeName}.`,
      ),
      createElement(
        "p",
        { key: "line2" },
        `Committee mandate: ${input.committeePurpose}`,
      ),
      createElement(
        "p",
        { key: "line3" },
        `Accept or decline here: ${responseUrl}`,
      ),
    ]),
    text: `${input.nominatedByName} nominated you for ${input.committeeName}. Mandate: ${input.committeePurpose}. Respond: ${responseUrl}`,
  });
}

export async function submitSelfNomination(
  committeeId: string,
  reason: string,
): Promise<ActionResult> {
  const member = await requireAuthedMember();
  if (member.error || !member.session) {
    return member.error ?? { ok: false, message: "Unauthorized." };
  }

  const parsed = nominationSchema.safeParse({ committeeId, reason });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid nomination input.",
    };
  }

  const committee = await db.query.committees.findFirst({
    where: eq(committees.id, parsed.data.committeeId),
  });
  if (!committee) {
    return { ok: false, message: "Committee not found." };
  }

  const now = new Date();
  if (
    committee.status !== "nominations_open" ||
    now < committee.nominationOpens ||
    now > committee.nominationCloses
  ) {
    return {
      ok: false,
      message: "Nominations are currently closed for this committee.",
    };
  }

  const [row] = await db
    .insert(committeeNominations)
    .values({
      committeeId: committee.id,
      nomineeId: member.session.user.id,
      nominatedById: member.session.user.id,
      reason: parsed.data.reason,
      status: "pending",
      createdAt: now,
    })
    .onConflictDoNothing({
      target: [
        committeeNominations.committeeId,
        committeeNominations.nomineeId,
      ],
    })
    .returning({ id: committeeNominations.id });

  if (!row) {
    return {
      ok: false,
      message: "A nomination already exists for this committee and nominee.",
    };
  }

  revalidatePath(`/committees/${committee.id}`);
  revalidatePath("/committees");
  revalidatePath(`/admin/committees/${committee.id}/nominations`);

  return { ok: true, message: "Your self-nomination has been submitted." };
}

export async function submitPeerNomination(
  committeeId: string,
  nomineeId: string,
  reason: string,
): Promise<ActionResult> {
  const member = await requireAuthedMember();
  if (member.error || !member.session) {
    return member.error ?? { ok: false, message: "Unauthorized." };
  }

  const parsed = peerNominationSchema.safeParse({
    committeeId,
    nomineeId,
    reason,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid nomination input.",
    };
  }

  const [committee, nominee, nominator] = await Promise.all([
    db.query.committees.findFirst({
      where: eq(committees.id, parsed.data.committeeId),
    }),
    db.query.users.findFirst({
      where: eq(users.id, parsed.data.nomineeId),
      columns: { id: true, name: true, email: true },
    }),
    db.query.users.findFirst({
      where: eq(users.id, member.session.user.id),
      columns: { name: true },
    }),
  ]);

  if (!committee) {
    return { ok: false, message: "Committee not found." };
  }
  if (!nominee) {
    return { ok: false, message: "Nominee not found." };
  }

  const nomineeProfile = await db.query.alumniProfiles.findFirst({
    where: and(
      eq(alumniProfiles.userId, nominee.id),
      eq(alumniProfiles.verificationStatus, "verified"),
    ),
    columns: { userId: true },
  });
  if (!nomineeProfile) {
    return { ok: false, message: "Only verified alumni can be nominated." };
  }

  const now = new Date();
  if (
    committee.status !== "nominations_open" ||
    now < committee.nominationOpens ||
    now > committee.nominationCloses
  ) {
    return {
      ok: false,
      message: "Nominations are currently closed for this committee.",
    };
  }

  const [row] = await db
    .insert(committeeNominations)
    .values({
      committeeId: committee.id,
      nomineeId: nominee.id,
      nominatedById: member.session.user.id,
      reason: parsed.data.reason,
      status: "pending",
      createdAt: now,
      confirmationSentAt: now,
    })
    .onConflictDoNothing({
      target: [
        committeeNominations.committeeId,
        committeeNominations.nomineeId,
      ],
    })
    .returning({ id: committeeNominations.id });

  if (!row) {
    return {
      ok: false,
      message: "This member already has a nomination for this committee.",
    };
  }

  await sendNominationRequestEmail({
    nominationId: row.id,
    committeeId: committee.id,
    committeeName: committee.name,
    committeePurpose: committee.purpose,
    nomineeEmail: nominee.email,
    nomineeName: nominee.name,
    nominatedByName: nominator?.name ?? "A fellow member",
  });

  revalidatePath(`/committees/${committee.id}`);
  revalidatePath("/committees");
  revalidatePath(`/admin/committees/${committee.id}/nominations`);

  return {
    ok: true,
    message: "Nomination submitted and nominee notified by email.",
  };
}

async function transitionNominationStatus(params: {
  nominationId: string;
  nextStatus: "confirmed_willing" | "declined" | "appointed";
  changedBy: string;
  responseNote?: string;
}) {
  const nomination = await getCommitteeNominationById(params.nominationId);
  if (!nomination) {
    return { ok: false, message: "Nomination not found." } as const;
  }

  const fromStatus = nomination.status;
  const now = new Date();
  const updateData: Partial<typeof nomination> = {
    status: params.nextStatus,
  };

  if (
    params.nextStatus === "confirmed_willing" ||
    params.nextStatus === "declined"
  ) {
    updateData.respondedAt = now;
    updateData.responseNote = params.responseNote?.trim() || null;
  }

  await db
    .update(committeeNominations)
    .set(updateData)
    .where(eq(committeeNominations.id, nomination.id));

  await logCommitteeNominationStatusChange({
    nominationId: nomination.id,
    fromStatus,
    toStatus: params.nextStatus,
    changedBy: params.changedBy,
  });

  return { ok: true, nomination } as const;
}

export async function acceptNomination(
  nominationId: string,
  responseNote?: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "You must be signed in." };
  }

  const parsedNote = responseNoteSchema.safeParse(responseNote);
  if (!parsedNote.success) {
    return {
      ok: false,
      message: parsedNote.error.issues[0]?.message ?? "Invalid response note.",
    };
  }

  const nomination = await getCommitteeNominationById(nominationId);
  if (!nomination) {
    return { ok: false, message: "Nomination not found." };
  }
  if (nomination.nomineeId !== session.user.id) {
    return {
      ok: false,
      message: "You can only respond to your own nomination.",
    };
  }
  if (nomination.status !== "pending") {
    return { ok: false, message: "This nomination can no longer be accepted." };
  }

  const transitioned = await transitionNominationStatus({
    nominationId,
    nextStatus: "confirmed_willing",
    changedBy: session.user.id,
    responseNote: parsedNote.data,
  });
  if (!transitioned.ok) {
    return transitioned;
  }

  const adminUserIds = await listAdminUserIdsForCommitteeNotifications(
    session.user.id,
  );
  if (adminUserIds.length > 0) {
    await createNotificationsForUsers({
      userIds: adminUserIds,
      type: "committee_nomination_accepted",
      title: "Committee nomination accepted",
      body: `${session.user.name ?? "A nominee"} accepted a committee nomination.`,
      actionUrl: `/admin/committees/${nomination.committeeId}/nominations`,
      idempotencyKeyPrefix: `committee_nomination_accepted:${nomination.id}`,
    });
  }

  revalidatePath(`/committees/${nomination.committeeId}`);
  revalidatePath(
    `/committees/${nomination.committeeId}/respond/${nomination.id}`,
  );
  revalidatePath(`/admin/committees/${nomination.committeeId}/nominations`);

  return {
    ok: true,
    message: "Nomination accepted. Thank you for your willingness to serve.",
  };
}

export async function declineNomination(
  nominationId: string,
  responseNote?: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "You must be signed in." };
  }

  const parsedNote = responseNoteSchema.safeParse(responseNote);
  if (!parsedNote.success) {
    return {
      ok: false,
      message: parsedNote.error.issues[0]?.message ?? "Invalid response note.",
    };
  }

  const nomination = await getCommitteeNominationById(nominationId);
  if (!nomination) {
    return { ok: false, message: "Nomination not found." };
  }
  if (nomination.nomineeId !== session.user.id) {
    return {
      ok: false,
      message: "You can only respond to your own nomination.",
    };
  }
  if (nomination.status !== "pending") {
    return { ok: false, message: "This nomination can no longer be declined." };
  }

  const transitioned = await transitionNominationStatus({
    nominationId,
    nextStatus: "declined",
    changedBy: session.user.id,
    responseNote: parsedNote.data,
  });
  if (!transitioned.ok) {
    return transitioned;
  }

  const adminUserIds = await listAdminUserIdsForCommitteeNotifications(
    session.user.id,
  );
  if (adminUserIds.length > 0) {
    await createNotificationsForUsers({
      userIds: adminUserIds,
      type: "committee_nomination_declined",
      title: "Committee nomination declined",
      body: `${session.user.name ?? "A nominee"} declined a committee nomination.`,
      actionUrl: `/admin/committees/${nomination.committeeId}/nominations`,
      idempotencyKeyPrefix: `committee_nomination_declined:${nomination.id}`,
    });
  }

  revalidatePath(`/committees/${nomination.committeeId}`);
  revalidatePath(
    `/committees/${nomination.committeeId}/respond/${nomination.id}`,
  );
  revalidatePath(`/admin/committees/${nomination.committeeId}/nominations`);

  return { ok: true, message: "Your response has been recorded." };
}

export async function appointToCommittee(
  nominationId: string,
  role?: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can appoint committee members." };
  }

  const nomination = await getCommitteeNominationById(nominationId);
  if (!nomination) {
    return { ok: false, message: "Nomination not found." };
  }
  if (nomination.status !== "confirmed_willing") {
    return {
      ok: false,
      message: "Only confirmed willing nominees can be appointed.",
    };
  }

  const committee = await db.query.committees.findFirst({
    where: eq(committees.id, nomination.committeeId),
  });
  if (!committee) {
    return { ok: false, message: "Committee not found." };
  }

  const memberCount = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(committeeMembers)
    .where(eq(committeeMembers.committeeId, committee.id));
  const currentCount = memberCount[0]?.value ?? 0;
  if (committee.maxMembers !== null && currentCount >= committee.maxMembers) {
    return {
      ok: false,
      message: "This committee is already at its max members target.",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(committeeNominations)
      .set({
        status: "appointed",
      })
      .where(eq(committeeNominations.id, nomination.id));

    await tx
      .insert(committeeMembers)
      .values({
        committeeId: nomination.committeeId,
        userId: nomination.nomineeId,
        role: role?.trim() ? role.trim() : "Member",
        appointedBy: session.user.id,
        appointedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [committeeMembers.committeeId, committeeMembers.userId],
      });
  });

  await logCommitteeNominationStatusChange({
    nominationId: nomination.id,
    fromStatus: nomination.status,
    toStatus: "appointed",
    changedBy: session.user.id,
  });

  const nominee = await db.query.users.findFirst({
    where: eq(users.id, nomination.nomineeId),
    columns: { email: true, name: true },
  });

  if (nominee) {
    await createNotification({
      userId: nomination.nomineeId,
      type: "committee_appointed",
      title: `You have been appointed to ${committee.name}`,
      body: "Your nomination has been converted into an official committee appointment.",
      actionUrl: `/committees/${committee.id}`,
      idempotencyKey: `committee_appointed:${nomination.id}:${nomination.nomineeId}`,
    });

    await sendEmail({
      to: nominee.email,
      subject: `Appointment confirmed: ${committee.name}`,
      react: createElement("div", null, [
        createElement(
          "p",
          { key: "greet" },
          `Hello ${nominee.name || "Member"},`,
        ),
        createElement(
          "p",
          { key: "body" },
          `You have been appointed to ${committee.name}${role?.trim() ? ` as ${role.trim()}` : ""}.`,
        ),
      ]),
      text: `You have been appointed to ${committee.name}${role?.trim() ? ` as ${role.trim()}` : ""}.`,
    });
  }

  revalidatePath(`/admin/committees/${committee.id}/nominations`);
  revalidatePath(`/committees/${committee.id}`);

  return { ok: true, message: "Nominee appointed to committee." };
}

export async function sendNominationReminder(
  nominationId: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can send nomination reminders." };
  }

  const nomination = await getCommitteeNominationById(nominationId);
  if (!nomination) {
    return { ok: false, message: "Nomination not found." };
  }
  if (nomination.status !== "pending") {
    return {
      ok: false,
      message: "Only pending nominations can receive reminders.",
    };
  }

  const [committee, nominee, nominator] = await Promise.all([
    db.query.committees.findFirst({
      where: eq(committees.id, nomination.committeeId),
      columns: { id: true, name: true, purpose: true },
    }),
    db.query.users.findFirst({
      where: eq(users.id, nomination.nomineeId),
      columns: { email: true, name: true },
    }),
    db.query.users.findFirst({
      where: eq(users.id, nomination.nominatedById),
      columns: { name: true },
    }),
  ]);

  if (!committee || !nominee) {
    return { ok: false, message: "Committee or nominee no longer exists." };
  }

  await sendNominationRequestEmail({
    nominationId: nomination.id,
    committeeId: committee.id,
    committeeName: committee.name,
    committeePurpose: committee.purpose,
    nomineeEmail: nominee.email,
    nomineeName: nominee.name,
    nominatedByName: nominator?.name ?? "A fellow member",
  });

  await db
    .update(committeeNominations)
    .set({ confirmationSentAt: new Date() })
    .where(eq(committeeNominations.id, nomination.id));

  revalidatePath(`/admin/committees/${committee.id}/nominations`);
  return { ok: true, message: "Reminder email sent." };
}

export async function createCommitteeAction(input: {
  name: string;
  purpose: string;
  maxMembers: number | null;
  nominationOpens: string;
  nominationCloses: string;
  status: "draft" | "nominations_open";
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can create committees." };
  }

  const parsed = createCommitteeSchema.safeParse({
    ...input,
    nominationOpens: input.nominationOpens,
    nominationCloses: input.nominationCloses,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid committee input.",
    };
  }

  const [created] = await db
    .insert(committees)
    .values({
      name: parsed.data.name,
      purpose: parsed.data.purpose,
      maxMembers: parsed.data.maxMembers,
      nominationOpens: parsed.data.nominationOpens,
      nominationCloses: parsed.data.nominationCloses,
      status: parsed.data.status,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: committees.id });

  if (!created) {
    return { ok: false, message: "Failed to create committee." };
  }

  if (parsed.data.status === "nominations_open") {
    const recipients = await db
      .select({ userId: alumniProfiles.userId })
      .from(alumniProfiles)
      .where(eq(alumniProfiles.verificationStatus, "verified"));
    await createNotificationsForUsers({
      userIds: recipients.map((recipient) => recipient.userId),
      type: "committee_nominations_open",
      title: "Committee nominations are now open",
      body: `${parsed.data.name} is now open for nominations.`,
      actionUrl: `/committees/${created.id}`,
      idempotencyKeyPrefix: `committee_nominations_open:${created.id}`,
    });
  }

  revalidatePath("/admin/committees");
  revalidatePath("/committees");
  return { ok: true, message: "Committee created successfully." };
}

const committeeStatusOrder = [
  "draft",
  "nominations_open",
  "nominations_closed",
  "active",
  "dissolved",
] as const;

type CommitteeStatus = (typeof committeeStatusOrder)[number];

function getAllowedNextCommitteeStatuses(
  status: CommitteeStatus,
): CommitteeStatus[] {
  if (status === "draft") return ["nominations_open"];
  if (status === "nominations_open") return ["nominations_closed", "dissolved"];
  if (status === "nominations_closed") return ["active", "dissolved"];
  if (status === "active") return ["dissolved"];
  return [];
}

async function notifyCommitteeNominationsOpen(committee: {
  id: string;
  name: string;
}) {
  const recipients = await db
    .select({ userId: alumniProfiles.userId })
    .from(alumniProfiles)
    .where(eq(alumniProfiles.verificationStatus, "verified"));

  await createNotificationsForUsers({
    userIds: recipients.map((recipient) => recipient.userId),
    type: "committee_nominations_open",
    title: "Committee nominations are now open",
    body: `${committee.name} is now open for nominations.`,
    actionUrl: `/committees/${committee.id}`,
    idempotencyKeyPrefix: `committee_nominations_open:${committee.id}`,
  });
}

async function revalidateCommitteeAdminPaths(committeeId: string) {
  revalidatePath("/admin/committees");
  revalidatePath(`/admin/committees/${committeeId}/nominations`);
  revalidatePath("/committees");
  revalidatePath(`/committees/${committeeId}`);
}

export async function updateCommitteeAction(input: {
  committeeId: string;
  name: string;
  purpose: string;
  maxMembers: number | null;
  nominationOpens: string;
  nominationCloses: string;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can update committees." };
  }

  const parsed = updateCommitteeSchema.safeParse({
    ...input,
    nominationOpens: input.nominationOpens,
    nominationCloses: input.nominationCloses,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid committee input.",
    };
  }

  const committee = await db.query.committees.findFirst({
    where: eq(committees.id, parsed.data.committeeId),
  });
  if (!committee) {
    return { ok: false, message: "Committee not found." };
  }
  if (committee.status === "dissolved") {
    return { ok: false, message: "Dissolved committees cannot be edited." };
  }

  if (parsed.data.maxMembers !== null) {
    const [{ value: currentMemberCount = 0 } = { value: 0 }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(committeeMembers)
      .where(eq(committeeMembers.committeeId, committee.id));
    if (parsed.data.maxMembers < currentMemberCount) {
      return {
        ok: false,
        message: `Max members cannot be lower than the ${currentMemberCount} already appointed member(s).`,
      };
    }
  }

  const now = new Date();
  await db
    .update(committees)
    .set({
      name: parsed.data.name,
      purpose: parsed.data.purpose,
      maxMembers: parsed.data.maxMembers,
      nominationOpens: parsed.data.nominationOpens,
      nominationCloses: parsed.data.nominationCloses,
      updatedAt: now,
    })
    .where(eq(committees.id, committee.id));

  await db.insert(consentLogs).values({
    userId: session.user.id,
    consentType: "data_processing",
    granted: true,
    action: "committee_update",
    resourceType: "committee",
    resourceId: committee.id,
    metadata: {
      previous_status: committee.status,
      changed_by: session.user.id,
    },
    createdAt: now,
  });

  await revalidateCommitteeAdminPaths(committee.id);
  return { ok: true, message: "Committee details updated." };
}

export async function updateCommitteeStatusAction(input: {
  committeeId: string;
  nextStatus: CommitteeStatus;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can update committee status." };
  }

  const parsed = updateCommitteeStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid status update.",
    };
  }

  const committee = await db.query.committees.findFirst({
    where: eq(committees.id, parsed.data.committeeId),
  });
  if (!committee) {
    return { ok: false, message: "Committee not found." };
  }

  const allowedStatuses = getAllowedNextCommitteeStatuses(committee.status);
  if (!allowedStatuses.includes(parsed.data.nextStatus)) {
    return {
      ok: false,
      message: `Cannot move committee from ${committee.status.replaceAll("_", " ")} to ${parsed.data.nextStatus.replaceAll("_", " ")}.`,
    };
  }

  const now = new Date();
  if (parsed.data.nextStatus === "nominations_open") {
    if (now > committee.nominationCloses) {
      return {
        ok: false,
        message: "Cannot open nominations after the configured close date.",
      };
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(committees)
      .set({
        status: parsed.data.nextStatus,
        updatedAt: now,
      })
      .where(eq(committees.id, committee.id));

    await tx.insert(consentLogs).values({
      userId: session.user.id,
      consentType: "data_processing",
      granted: true,
      action: "committee_status_change",
      resourceType: "committee",
      resourceId: committee.id,
      metadata: {
        from_status: committee.status,
        to_status: parsed.data.nextStatus,
        changed_by: session.user.id,
      },
      createdAt: now,
    });
  });

  if (parsed.data.nextStatus === "nominations_open") {
    await notifyCommitteeNominationsOpen(committee);
  }

  await revalidateCommitteeAdminPaths(committee.id);
  return {
    ok: true,
    message: `Committee moved to ${parsed.data.nextStatus.replaceAll("_", " ")}.`,
  };
}

export async function advanceCommitteeStatusAction(
  committeeId: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isAdminUserRole((session.user as { role?: string }).role)) {
    return { ok: false, message: "Only admins can advance committee status." };
  }

  const committee = await db.query.committees.findFirst({
    where: eq(committees.id, committeeId),
  });
  if (!committee) {
    return { ok: false, message: "Committee not found." };
  }

  const currentIndex = committeeStatusOrder.indexOf(committee.status);
  if (currentIndex < 0 || currentIndex >= committeeStatusOrder.length - 1) {
    return { ok: false, message: "Committee is already in its final status." };
  }
  const nextStatus = committeeStatusOrder[currentIndex + 1];
  return updateCommitteeStatusAction({ committeeId, nextStatus });
}
