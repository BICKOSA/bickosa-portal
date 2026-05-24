"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createAnnouncement,
  previewRecipientCount,
  sendAnnouncementNow,
  type AnnouncementAudience,
  type AnnouncementChannel,
} from "@/lib/announcements";
import { requireAdminPageSession } from "@/lib/admin-auth";

type ActionResult<T = void> =
  | ({ ok: true; message: string } & T)
  | { ok: false; message: string };

const audienceEnum = z.enum([
  "all_members",
  "verified_only",
  "chapter",
  "admins",
]);
const channelEnum = z.enum(["email", "sms", "in_app"]);

const composeSchema = z
  .object({
    title: z.string().trim().min(3, "Title is required.").max(255),
    summary: z
      .union([z.literal(""), z.string().trim().max(500)])
      .optional()
      .transform((value) => (value ? value : null)),
    body: z.string().trim().min(10, "Body is too short.").max(10_000),
    ctaLabel: z
      .union([z.literal(""), z.string().trim().max(80)])
      .optional()
      .transform((value) => (value ? value : null)),
    ctaUrl: z
      .union([z.literal(""), z.string().trim().url("CTA URL must be a valid URL.")])
      .optional()
      .transform((value) => (value ? value : null)),
    audience: audienceEnum,
    chapterId: z.string().uuid().nullable().optional().transform((value) => value ?? null),
    channels: z.array(channelEnum).min(1, "Pick at least one channel."),
  })
  .refine((value) => Boolean(value.ctaLabel) === Boolean(value.ctaUrl), {
    message: "Provide both a CTA label and URL, or neither.",
    path: ["ctaUrl"],
  })
  .refine(
    (value) => (value.audience === "chapter" ? Boolean(value.chapterId) : true),
    { message: "Pick a chapter for chapter-scoped announcements.", path: ["chapterId"] },
  );

export type ComposeAnnouncementInput = z.input<typeof composeSchema>;

export async function createAnnouncementAction(
  input: ComposeAnnouncementInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminPageSession();
  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid announcement input.",
    };
  }

  const result = await createAnnouncement({
    ...parsed.data,
    createdById: session.user.id,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/admin/announcements");
  return { ok: true, message: "Draft saved.", id: result.id };
}

export async function sendAnnouncementAction(
  announcementId: string,
): Promise<ActionResult<{ recipients?: number; success?: number; failed?: number }>> {
  await requireAdminPageSession();
  const parsed = z.string().uuid().safeParse(announcementId);
  if (!parsed.success) {
    return { ok: false, message: "Invalid announcement id." };
  }

  const result = await sendAnnouncementNow(parsed.data);
  revalidatePath("/admin/announcements");
  revalidatePath(`/admin/announcements/${parsed.data}`);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return {
    ok: true,
    message: `Sent to ${result.successCount} of ${result.recipientCount} recipient${
      result.recipientCount === 1 ? "" : "s"
    }.`,
    recipients: result.recipientCount,
    success: result.successCount,
    failed: result.failureCount,
  };
}

export async function previewAnnouncementAudienceAction(input: {
  audience: AnnouncementAudience;
  chapterId: string | null;
}): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  await requireAdminPageSession();
  const audience = audienceEnum.safeParse(input.audience);
  if (!audience.success) return { ok: false, message: "Invalid audience." };
  const count = await previewRecipientCount(audience.data, input.chapterId);
  return { ok: true, count };
}

// Keep channel type re-exported so the UI can import it without pulling in
// the server lib.
export type { AnnouncementAudience, AnnouncementChannel };
