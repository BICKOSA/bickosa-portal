"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Save } from "lucide-react";

import {
  createAnnouncementAction,
  previewAnnouncementAudienceAction,
  sendAnnouncementAction,
  type AnnouncementAudience,
  type AnnouncementChannel,
} from "@/app/actions/admin-announcements";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type Chapter = { id: string; name: string };

type ComposeProps = {
  chapters: Chapter[];
};

const composeFormSchema = z
  .object({
    title: z.string().trim().min(3, "Title is required.").max(255),
    summary: z.string().trim().max(500).optional(),
    body: z
      .string()
      .trim()
      .min(10, "Body must be at least 10 characters.")
      .max(10_000),
    ctaLabel: z.string().trim().max(80).optional(),
    ctaUrl: z
      .union([z.literal(""), z.url("CTA URL must be a valid URL.")])
      .optional(),
    audience: z.enum(["all_members", "verified_only", "chapter", "admins"]),
    chapterId: z.string().uuid().optional(),
    channelEmail: z.boolean(),
    channelInApp: z.boolean(),
    channelSms: z.boolean(),
  })
  .refine((value) => Boolean(value.ctaLabel) === Boolean(value.ctaUrl), {
    message: "Provide both a CTA label and URL, or neither.",
    path: ["ctaUrl"],
  })
  .refine(
    (value) =>
      value.channelEmail || value.channelInApp || value.channelSms,
    { message: "Pick at least one channel.", path: ["channelEmail"] },
  )
  .refine(
    (value) =>
      value.audience === "chapter" ? Boolean(value.chapterId) : true,
    { message: "Pick a chapter.", path: ["chapterId"] },
  );

type FormValues = z.infer<typeof composeFormSchema>;

const audienceOptions: Array<{ value: AnnouncementAudience; label: string; hint: string }> = [
  { value: "all_members", label: "All members", hint: "Anyone with a portal account, including pending verifications." },
  { value: "verified_only", label: "Verified only", hint: "Only members whose alumni status has been approved." },
  { value: "chapter", label: "Specific chapter", hint: "Verified members in one chapter." },
  { value: "admins", label: "Admins only", hint: "Useful for internal coordination." },
];

export function ComposeAnnouncementForm({ chapters }: ComposeProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewing, setPreviewing] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(composeFormSchema),
    defaultValues: {
      title: "",
      summary: "",
      body: "",
      ctaLabel: "",
      ctaUrl: "",
      audience: "verified_only",
      chapterId: undefined,
      channelEmail: true,
      channelInApp: true,
      channelSms: false,
    },
  });

  const audience = form.watch("audience");
  const chapterId = form.watch("chapterId");
  const channelEmail = form.watch("channelEmail");
  const channelInApp = form.watch("channelInApp");
  const channelSms = form.watch("channelSms");

  const channels = useMemo<AnnouncementChannel[]>(
    () =>
      [
        channelEmail ? ("email" as const) : null,
        channelInApp ? ("in_app" as const) : null,
        channelSms ? ("sms" as const) : null,
      ].filter(Boolean) as AnnouncementChannel[],
    [channelEmail, channelInApp, channelSms],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (audience === "chapter" && !chapterId) {
        setPreviewCount(0);
        return;
      }
      setPreviewing(true);
      const result = await previewAnnouncementAudienceAction({
        audience,
        chapterId: audience === "chapter" ? chapterId ?? null : null,
      });
      if (cancelled) return;
      setPreviewCount(result.ok ? result.count : null);
      setPreviewing(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [audience, chapterId]);

  function buildPayload(values: FormValues) {
    return {
      title: values.title.trim(),
      summary: values.summary?.trim() || "",
      body: values.body.trim(),
      ctaLabel: values.ctaLabel?.trim() || "",
      ctaUrl: values.ctaUrl?.trim() || "",
      audience: values.audience,
      chapterId: values.audience === "chapter" ? values.chapterId ?? null : null,
      channels,
    };
  }

  async function handleSaveDraft(values: FormValues) {
    const result = await createAnnouncementAction(buildPayload(values));
    if (!result.ok) {
      toast({ title: "Could not save", description: result.message });
      return null;
    }
    toast({ title: "Draft saved", variant: "success" });
    setCreatedId(result.id);
    return result.id;
  }

  async function handleSendNow(values: FormValues) {
    const id = createdId ?? (await handleSaveDraft(values));
    if (!id) return;
    startTransition(async () => {
      const result = await sendAnnouncementAction(id);
      if (!result.ok) {
        toast({
          title: "Sending failed",
          description: result.message,
        });
        return;
      }
      toast({
        title: "Announcement dispatched",
        description: result.message,
        variant:
          (result.failed ?? 0) > 0 && (result.success ?? 0) > 0
            ? "warning"
            : "success",
        durationMs: 6500,
      });
      router.push("/admin/announcements");
    });
  }

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="space-y-6 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. AGM is next Saturday"
            {...form.register("title")}
            error={form.formState.errors.title?.message}
            helperText="Used as both the email subject and the in-app notification headline."
          />
          <Input
            label="Summary (optional)"
            placeholder="One-sentence preview of the message."
            {...form.register("summary")}
            error={form.formState.errors.summary?.message}
            helperText="Shown in email preview text and as the body of the in-app notification."
          />
          <Textarea
            label="Body"
            rows={10}
            placeholder="Write your announcement here. Use blank lines to separate paragraphs."
            {...form.register("body")}
            error={form.formState.errors.body?.message}
            helperText={`${form.watch("body")?.length ?? 0}/10000 characters`}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="CTA button label (optional)"
              placeholder="e.g. RSVP now"
              {...form.register("ctaLabel")}
              error={form.formState.errors.ctaLabel?.message}
            />
            <Input
              label="CTA button URL (optional)"
              type="url"
              placeholder="https://portal.bickosa.com/events/agm"
              {...form.register("ctaUrl")}
              error={form.formState.errors.ctaUrl?.message}
            />
          </div>
        </div>

        <aside className="space-y-4 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
              Audience
            </p>
            <div className="mt-2 space-y-1.5">
              {audienceOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2 rounded-[var(--r-md)] border border-transparent bg-[var(--white)] px-2.5 py-2 text-sm text-[var(--text-2)] transition hover:border-[var(--navy-200)]"
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...form.register("audience")}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-[var(--navy-900)]">
                      {option.label}
                    </span>
                    <span className="block text-xs text-[var(--text-3)]">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {audience === "chapter" ? (
              <label className="mt-2 flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
                Chapter
                <select
                  {...form.register("chapterId")}
                  className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select chapter
                  </option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.chapterId?.message ? (
                  <p className="text-xs text-[var(--error)]">
                    {form.formState.errors.chapterId.message}
                  </p>
                ) : null}
              </label>
            ) : null}
            <p className="mt-2 rounded-[var(--r-md)] bg-[var(--navy-50)] px-3 py-2 text-xs text-[var(--navy-700)]">
              {isPreviewing
                ? "Counting recipients…"
                : previewCount === null
                  ? "Recipient count unavailable."
                  : `${previewCount.toLocaleString()} recipient${previewCount === 1 ? "" : "s"}`}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
              Channels
            </p>
            <div className="mt-2 space-y-1.5 text-sm text-[var(--text-2)]">
              <label className="flex items-start gap-2">
                <Checkbox
                  checked={channelEmail}
                  onCheckedChange={(checked) =>
                    form.setValue("channelEmail", Boolean(checked), {
                      shouldValidate: true,
                    })
                  }
                />
                <span>
                  Email
                  <span className="block text-xs text-[var(--text-3)]">
                    Rich HTML email via Resend.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <Checkbox
                  checked={channelInApp}
                  onCheckedChange={(checked) =>
                    form.setValue("channelInApp", Boolean(checked), {
                      shouldValidate: true,
                    })
                  }
                />
                <span>
                  In-app notification
                  <span className="block text-xs text-[var(--text-3)]">
                    Shows in the bell menu on next portal visit.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 opacity-70">
                <Checkbox
                  checked={channelSms}
                  onCheckedChange={(checked) =>
                    form.setValue("channelSms", Boolean(checked), {
                      shouldValidate: true,
                    })
                  }
                />
                <span>
                  SMS
                  <span className="block text-xs text-[var(--text-3)]">
                    Logged as queued; SMS delivery turns on once Egosms is enabled.
                  </span>
                </span>
              </label>
            </div>
            {form.formState.errors.channelEmail?.message ? (
              <p className="mt-1 text-xs text-[var(--error)]">
                {form.formState.errors.channelEmail.message}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
        <Button
          type="button"
          variant="outline"
          isLoading={pending}
          onClick={() => void form.handleSubmit(handleSaveDraft)()}
        >
          <Save className="size-4" />
          Save as draft
        </Button>
        <Button
          type="button"
          variant="gold"
          isLoading={pending}
          onClick={() => void form.handleSubmit(handleSendNow)()}
        >
          <Send className="size-4" />
          Send now
        </Button>
      </div>
    </form>
  );
}
