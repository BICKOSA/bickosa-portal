import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { notificationDispatchLog, notifications, users } from "@/lib/db/schema";

export const notificationTypes = [
  "verification_approved",
  "verification_rejected",
  "event_reminder",
  "rsvp_confirmed",
  "donation_received",
  "mentorship_request",
  "mentorship_accepted",
  "new_campaign",
  "campaign_milestone",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export const notificationTitleTemplates: Record<NotificationType, string> = {
  verification_approved: "Your membership has been verified!",
  verification_rejected: "Membership verification update",
  event_reminder: "Reminder: [Event] is tomorrow",
  rsvp_confirmed: "RSVP confirmed for [Event]",
  donation_received: "Thank you for your donation",
  mentorship_request: "[Name] wants you as a mentor",
  mentorship_accepted: "[Mentor] accepted your request",
  new_campaign: "New fundraising campaign: [Title]",
  campaign_milestone: "[Campaign] reached 50% of its goal!",
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  idempotencyKey?: string | null;
};

export type CreateBulkNotificationInput = {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  idempotencyKeyPrefix?: string | null;
};

function normalizeActionUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<{ id: string | null; created: boolean }> {
  const normalizedIdempotencyKey = input.idempotencyKey?.trim();
  if (normalizedIdempotencyKey) {
    const created = await db.transaction(async (tx) => {
      const [dispatchRow] = await tx
        .insert(notificationDispatchLog)
        .values({
          idempotencyKey: normalizedIdempotencyKey,
          userId: input.userId,
          type: input.type,
          createdAt: new Date(),
        })
        .onConflictDoNothing({
          target: notificationDispatchLog.idempotencyKey,
        })
        .returning({
          id: notificationDispatchLog.id,
        });

      if (!dispatchRow) {
        return null;
      }

      const [notificationRow] = await tx
        .insert(notifications)
        .values({
          userId: input.userId,
          type: input.type,
          title: input.title.trim(),
          body: input.body.trim(),
          actionUrl: normalizeActionUrl(input.actionUrl),
          isRead: false,
          createdAt: new Date(),
        })
        .returning({ id: notifications.id });

      if (!notificationRow) {
        throw new Error("Failed to create notification.");
      }

      await tx
        .update(notificationDispatchLog)
        .set({
          notificationId: notificationRow.id,
        })
        .where(eq(notificationDispatchLog.id, dispatchRow.id));

      return notificationRow;
    });

    if (!created) {
      return { id: null, created: false };
    }

    return { id: created.id, created: true };
  }

  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      actionUrl: normalizeActionUrl(input.actionUrl),
      isRead: false,
      createdAt: new Date(),
    })
    .returning({ id: notifications.id });

  if (!row) {
    throw new Error("Failed to create notification.");
  }

  return { id: row.id, created: true };
}

export async function createNotificationsForUsers(
  input: CreateBulkNotificationInput,
): Promise<{ createdCount: number }> {
  const userIds = Array.from(new Set(input.userIds.filter(Boolean)));
  if (userIds.length === 0) {
    return { createdCount: 0 };
  }

  const normalizedPrefix = input.idempotencyKeyPrefix?.trim();
  if (normalizedPrefix) {
    let createdCount = 0;
    for (const userId of userIds) {
      const result = await createNotification({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        idempotencyKey: `${normalizedPrefix}:${userId}`,
      });
      if (result.created) {
        createdCount += 1;
      }
    }
    return { createdCount };
  }

  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      actionUrl: normalizeActionUrl(input.actionUrl),
      isRead: false,
      createdAt: new Date(),
    })),
  );

  return { createdCount: userIds.length };
}

export async function listAllNotificationRecipientUserIds(): Promise<string[]> {
  const rows = await db.select({ id: users.id }).from(users);
  return rows.map((row) => row.id);
}
