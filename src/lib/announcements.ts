import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  announcementDeliveries,
  announcements,
  chapters,
  users,
} from "@/lib/db/schema";
import { sendAnnouncementEmail } from "@/lib/email/resend";
import { createNotification } from "@/lib/notifications/create-notification";

export type AnnouncementAudience =
  | "all_members"
  | "verified_only"
  | "chapter"
  | "admins";

export type AnnouncementChannel = "email" | "sms" | "in_app";

export type AnnouncementStatus =
  | "draft"
  | "sending"
  | "sent"
  | "partial"
  | "failed";

export type AnnouncementInput = {
  title: string;
  summary: string | null;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  audience: AnnouncementAudience;
  chapterId: string | null;
  channels: AnnouncementChannel[];
  createdById: string;
};

export type AnnouncementListRow = {
  id: string;
  title: string;
  audience: AnnouncementAudience;
  channels: AnnouncementChannel[];
  status: AnnouncementStatus;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  sentAt: Date | null;
  authorName: string | null;
};

const EMAIL_CONCURRENCY = 5;

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.bickosa.org";
}

function normalize(input: AnnouncementInput): AnnouncementInput {
  return {
    ...input,
    title: input.title.trim(),
    summary: input.summary?.trim() || null,
    body: input.body.trim(),
    ctaLabel: input.ctaLabel?.trim() || null,
    ctaUrl: input.ctaUrl?.trim() || null,
    chapterId: input.audience === "chapter" ? input.chapterId : null,
    channels: Array.from(new Set(input.channels)),
  };
}

function validate(input: AnnouncementInput): string | null {
  if (input.title.length < 3) return "Title must be at least 3 characters.";
  if (input.title.length > 255) return "Title is too long.";
  if (input.body.length < 10) return "Body must be at least 10 characters.";
  if (input.summary && input.summary.length > 500) return "Summary is too long.";
  if (Boolean(input.ctaLabel) !== Boolean(input.ctaUrl)) {
    return "Provide both a CTA label and URL, or neither.";
  }
  if (input.ctaUrl) {
    try {
      new URL(input.ctaUrl);
    } catch {
      return "CTA URL must be a valid absolute URL.";
    }
  }
  if (input.channels.length === 0) {
    return "Pick at least one delivery channel.";
  }
  if (input.audience === "chapter" && !input.chapterId) {
    return "Pick a chapter for chapter-scoped announcements.";
  }
  return null;
}

export async function createAnnouncement(
  input: AnnouncementInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const normalised = normalize(input);
  const validationError = validate(normalised);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const [row] = await db
    .insert(announcements)
    .values({
      title: normalised.title,
      summary: normalised.summary,
      body: normalised.body,
      ctaLabel: normalised.ctaLabel,
      ctaUrl: normalised.ctaUrl,
      audience: normalised.audience,
      chapterId: normalised.chapterId,
      channels: normalised.channels,
      status: "draft",
      createdById: normalised.createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: announcements.id });

  if (!row) {
    return { ok: false, message: "Could not save announcement." };
  }

  return { ok: true, id: row.id };
}

async function resolveAudienceUserIds(
  audience: AnnouncementAudience,
  chapterId: string | null,
): Promise<Array<{ id: string; name: string | null; email: string }>> {
  if (audience === "admins") {
    return db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.role, "admin"));
  }

  if (audience === "chapter") {
    if (!chapterId) return [];
    return db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .innerJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
      .where(
        and(
          eq(alumniProfiles.chapterId, chapterId),
          eq(alumniProfiles.verificationStatus, "verified"),
        ),
      );
  }

  if (audience === "verified_only") {
    return db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .innerJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
      .where(eq(alumniProfiles.verificationStatus, "verified"));
  }

  // all_members: anyone with a user account, including pending/rejected.
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);
}

type Recipient = {
  id: string;
  name: string | null;
  email: string;
};

async function dispatchEmail(
  announcementId: string,
  recipient: Recipient,
  payload: {
    title: string;
    summary: string | null;
    body: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    authorName: string | null;
  },
): Promise<{ ok: boolean; providerRef?: string; error?: string }> {
  try {
    const result = await sendAnnouncementEmail({
      to: recipient.email,
      title: payload.title,
      summary: payload.summary,
      body: payload.body,
      ctaLabel: payload.ctaLabel,
      ctaUrl: payload.ctaUrl,
      authorName: payload.authorName,
      recipientName: recipient.name,
      preferencesUrl: `${appUrl()}/settings/privacy`,
    });
    return { ok: true, providerRef: result.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email failure";
    return { ok: false, error: message };
  }
}

async function dispatchInApp(
  announcementId: string,
  recipient: Recipient,
  payload: { title: string; summary: string | null; ctaUrl: string | null },
): Promise<{ ok: boolean; providerRef?: string; error?: string }> {
  try {
    const result = await createNotification({
      userId: recipient.id,
      type: "announcement",
      title: payload.title,
      body: payload.summary ?? payload.title,
      actionUrl: payload.ctaUrl ?? null,
      idempotencyKey: `announcement:${announcementId}:${recipient.id}`,
    });
    return { ok: true, providerRef: result.id ?? undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown notification failure";
    return { ok: false, error: message };
  }
}

async function recordDelivery(args: {
  announcementId: string;
  userId: string;
  channel: AnnouncementChannel;
  status: "sent" | "failed" | "skipped";
  providerRef?: string;
  error?: string;
}): Promise<void> {
  const sentAt = args.status === "sent" ? new Date() : null;
  await db
    .insert(announcementDeliveries)
    .values({
      announcementId: args.announcementId,
      userId: args.userId,
      channel: args.channel,
      status: args.status,
      providerRef: args.providerRef ?? null,
      errorMessage: args.error ?? null,
      sentAt,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        announcementDeliveries.announcementId,
        announcementDeliveries.userId,
        announcementDeliveries.channel,
      ],
      set: {
        status: args.status,
        providerRef: args.providerRef ?? null,
        errorMessage: args.error ?? null,
        sentAt,
      },
    });
}

async function runInBatches<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  async function next(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, next);
  await Promise.all(workers);
  return results;
}

export async function sendAnnouncementNow(
  announcementId: string,
): Promise<
  | { ok: true; recipientCount: number; successCount: number; failureCount: number }
  | { ok: false; message: string }
> {
  const [announcement] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, announcementId))
    .limit(1);

  if (!announcement) {
    return { ok: false, message: "Announcement not found." };
  }
  if (announcement.status === "sending") {
    return { ok: false, message: "Announcement is already being sent." };
  }
  if (announcement.status === "sent") {
    return { ok: false, message: "Announcement has already been sent." };
  }

  await db
    .update(announcements)
    .set({ status: "sending", updatedAt: new Date() })
    .where(eq(announcements.id, announcementId));

  const author = await db.query.users.findFirst({
    where: eq(users.id, announcement.createdById),
    columns: { name: true },
  });

  const recipients = await resolveAudienceUserIds(
    announcement.audience as AnnouncementAudience,
    announcement.chapterId,
  );

  let successCount = 0;
  let failureCount = 0;
  const channels = announcement.channels as AnnouncementChannel[];
  const wantsEmail = channels.includes("email");
  const wantsInApp = channels.includes("in_app");
  const wantsSms = channels.includes("sms");

  // SMS dispatch is intentionally disabled for now — record everyone as
  // skipped so we can backfill once the SMS rollout flips on.
  if (wantsSms) {
    for (const recipient of recipients) {
      await recordDelivery({
        announcementId,
        userId: recipient.id,
        channel: "sms",
        status: "skipped",
        error: "SMS channel is not enabled yet.",
      });
    }
  }

  if (wantsInApp) {
    await runInBatches(recipients, EMAIL_CONCURRENCY, async (recipient) => {
      const result = await dispatchInApp(announcementId, recipient, {
        title: announcement.title,
        summary: announcement.summary,
        ctaUrl: announcement.ctaUrl,
      });
      await recordDelivery({
        announcementId,
        userId: recipient.id,
        channel: "in_app",
        status: result.ok ? "sent" : "failed",
        providerRef: result.providerRef,
        error: result.error,
      });
      if (result.ok) successCount++;
      else failureCount++;
    });
  }

  if (wantsEmail) {
    await runInBatches(recipients, EMAIL_CONCURRENCY, async (recipient) => {
      const result = await dispatchEmail(announcementId, recipient, {
        title: announcement.title,
        summary: announcement.summary,
        body: announcement.body,
        ctaLabel: announcement.ctaLabel,
        ctaUrl: announcement.ctaUrl,
        authorName: author?.name ?? null,
      });
      await recordDelivery({
        announcementId,
        userId: recipient.id,
        channel: "email",
        status: result.ok ? "sent" : "failed",
        providerRef: result.providerRef,
        error: result.error,
      });
      if (result.ok) successCount++;
      else failureCount++;
    });
  }

  const channelMultiplier =
    (wantsEmail ? 1 : 0) + (wantsInApp ? 1 : 0);
  const expected = recipients.length * channelMultiplier;
  const finalStatus: AnnouncementStatus =
    expected === 0
      ? "sent"
      : failureCount === 0
        ? "sent"
        : successCount === 0
          ? "failed"
          : "partial";

  await db
    .update(announcements)
    .set({
      status: finalStatus,
      sentAt: new Date(),
      recipientCount: recipients.length,
      successCount,
      failureCount,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, announcementId));

  return {
    ok: true,
    recipientCount: recipients.length,
    successCount,
    failureCount,
  };
}

export async function listAnnouncementsForAdmin(): Promise<AnnouncementListRow[]> {
  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      audience: announcements.audience,
      channels: announcements.channels,
      status: announcements.status,
      recipientCount: announcements.recipientCount,
      successCount: announcements.successCount,
      failureCount: announcements.failureCount,
      createdAt: announcements.createdAt,
      sentAt: announcements.sentAt,
      authorName: users.name,
    })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.createdById))
    .orderBy(desc(announcements.createdAt))
    .limit(100);

  return rows.map((row) => ({
    ...row,
    audience: row.audience as AnnouncementAudience,
    channels: row.channels as AnnouncementChannel[],
    status: row.status as AnnouncementStatus,
  }));
}

export async function listChaptersForAnnouncements() {
  return db
    .select({ id: chapters.id, name: chapters.name })
    .from(chapters)
    .where(eq(chapters.isActive, true))
    .orderBy(chapters.name);
}

export async function getAnnouncementById(id: string) {
  const [row] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  return row ?? null;
}

export async function previewRecipientCount(
  audience: AnnouncementAudience,
  chapterId: string | null,
): Promise<number> {
  if (audience === "admins") {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, "admin"));
    return row?.count ?? 0;
  }
  if (audience === "chapter") {
    if (!chapterId) return 0;
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alumniProfiles)
      .where(
        and(
          eq(alumniProfiles.chapterId, chapterId),
          eq(alumniProfiles.verificationStatus, "verified"),
        ),
      );
    return row?.count ?? 0;
  }
  if (audience === "verified_only") {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alumniProfiles)
      .where(eq(alumniProfiles.verificationStatus, "verified"));
    return row?.count ?? 0;
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return row?.count ?? 0;
}
