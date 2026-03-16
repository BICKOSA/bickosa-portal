"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectField,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { AdminEventDetail } from "@/lib/admin-events";

const eventTypeOptions = [
  "gala",
  "sports",
  "careers",
  "governance",
  "reunion",
  "school",
  "diaspora",
] as const;

const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens."),
    type: z.enum(eventTypeOptions),
    startAt: z.string().min(1, "Start date/time is required."),
    endAt: z.string().optional(),
    timezone: z.string().trim().min(1, "Timezone is required."),
    locationName: z.string().optional(),
    locationAddress: z.string().optional(),
    locationCity: z.string().optional(),
    isOnline: z.boolean(),
    onlineUrl: z.union([z.literal(""), z.url("Enter a valid URL.")]),
    description: z.string().optional(),
    bannerColor: z.string().optional(),
    rsvpDeadline: z.string().optional(),
    maxAttendees: z.union([z.literal(""), z.string().regex(/^\d+$/, "Use numbers only.")]),
    ticketPrice: z.string().regex(/^\d+$/, "Ticket price must be a whole number."),
    currency: z.string().trim().min(1),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
    chapterId: z.string().optional(),
  })
  .refine((value) => !value.isOnline || value.onlineUrl.length > 0, {
    path: ["onlineUrl"],
    message: "Online URL is required for online events.",
  });

type EventFormValues = z.infer<typeof eventFormSchema>;

type EventFormProps = {
  mode: "create" | "edit";
  event?: AdminEventDetail;
  chapterOptions: Array<{ id: string; name: string }>;
};

function toDateTimeLocal(value: Date | null): string {
  if (!value) {
    return "";
  }
  const local = new Date(value);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  const hours = String(local.getHours()).padStart(2, "0");
  const minutes = String(local.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toDefaults(event?: AdminEventDetail): EventFormValues {
  return {
    title: event?.title ?? "",
    slug: event?.slug ?? "",
    type: event?.type ?? "gala",
    startAt: toDateTimeLocal(event?.startAt ?? null),
    endAt: toDateTimeLocal(event?.endAt ?? null),
    timezone: event?.timezone ?? "Africa/Kampala",
    locationName: event?.locationName ?? "",
    locationAddress: event?.locationAddress ?? "",
    locationCity: event?.locationCity ?? "",
    isOnline: event?.isOnline ?? false,
    onlineUrl: event?.onlineUrl ?? "",
    description: event?.description ?? "",
    bannerColor: event?.bannerColor ?? "#1a3060",
    rsvpDeadline: toDateTimeLocal(event?.rsvpDeadline ?? null),
    maxAttendees: event?.maxAttendees ? String(event.maxAttendees) : "",
    ticketPrice: String(event?.ticketPrice ?? 0),
    currency: event?.currency ?? "UGX",
    isFeatured: event?.isFeatured ?? false,
    isPublished: event?.isPublished ?? false,
    chapterId: event?.chapterId ?? "",
  };
}

export function EventForm({ mode, event, chapterOptions }: EventFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSlugTouched, setIsSlugTouched] = useState(mode === "edit");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [slugCheckState, setSlugCheckState] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  );
  const [slugHelperText, setSlugHelperText] = useState<string>("");

  const defaultValues = useMemo(() => toDefaults(event), [event]);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  const watchedTitle = watch("title");
  const watchedDescription = watch("description");
  const watchedOnline = watch("isOnline");
  const watchedSlug = watch("slug");

  useEffect(() => {
    if (!isSlugTouched) {
      setValue("slug", slugify(watchedTitle), { shouldDirty: true });
    }
  }, [isSlugTouched, setValue, watchedTitle]);

  useEffect(() => {
    if (!watchedSlug || watchedSlug.trim().length < 3) {
      setSlugCheckState("idle");
      setSlugHelperText("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSlugCheckState("checking");
      try {
        const query = new URLSearchParams({
          slug: watchedSlug,
        });
        if (event?.id) {
          query.set("excludeId", event.id);
        }
        const response = await fetch(`/api/admin/events/slug?${query.toString()}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed slug check.");
        }
        const payload = (await response.json()) as {
          available: boolean;
          normalizedSlug: string;
        };
        if (payload.normalizedSlug !== watchedSlug) {
          setValue("slug", payload.normalizedSlug, { shouldDirty: true });
        }
        if (payload.available) {
          setSlugCheckState("available");
          setSlugHelperText("Slug is available.");
        } else {
          setSlugCheckState("taken");
          setSlugHelperText("Slug already exists. Choose another.");
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setSlugCheckState("idle");
        setSlugHelperText("");
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [event?.id, setValue, watchedSlug]);

  async function onSubmit(values: EventFormValues) {
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("slug", values.slug);
    formData.set("type", values.type);
    formData.set("startAt", values.startAt);
    if (values.endAt) formData.set("endAt", values.endAt);
    formData.set("timezone", values.timezone);
    formData.set("locationName", values.locationName ?? "");
    formData.set("locationAddress", values.locationAddress ?? "");
    formData.set("locationCity", values.locationCity ?? "");
    formData.set("isOnline", String(values.isOnline));
    formData.set("onlineUrl", values.onlineUrl ?? "");
    formData.set("description", values.description ?? "");
    formData.set("bannerColor", values.bannerColor ?? "");
    formData.set("rsvpDeadline", values.rsvpDeadline ?? "");
    formData.set("maxAttendees", values.maxAttendees ?? "");
    formData.set("ticketPrice", values.ticketPrice);
    formData.set("currency", values.currency);
    formData.set("isFeatured", String(values.isFeatured));
    formData.set("isPublished", String(values.isPublished));
    formData.set("chapterId", values.chapterId ?? "");
    if (bannerFile) {
      formData.set("bannerImage", bannerFile);
    }

    const endpoint = mode === "create" ? "/api/admin/events" : `/api/admin/events/${event?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast({
        title: "Could not save event",
        description: body?.message ?? "Please check the fields and try again.",
      });
      return;
    }

    const body = (await response.json()) as { id: string };
    toast({
      title: mode === "create" ? "Event created" : "Event updated",
      variant: "success",
    });
    if (mode === "create") {
      router.push(`/admin/events/${body.id}/edit`);
      router.refresh();
      return;
    }
    router.push("/admin/events");
    router.refresh();
  }

  const selectedBannerFileName = bannerFile?.name ?? null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" {...register("title")} error={errors.title?.message} />
        <Input
          label="Slug"
          {...register("slug")}
          error={errors.slug?.message}
          helperText={errors.slug?.message ? undefined : slugHelperText || "Lowercase letters, numbers, and hyphens only."}
          onChange={(eventInput) => {
            setIsSlugTouched(true);
            setValue("slug", slugify(eventInput.target.value), { shouldDirty: true });
          }}
          className={
            slugCheckState === "taken"
              ? "border-[var(--error)] focus:border-[var(--error)]"
              : slugCheckState === "available"
                ? "border-[var(--success)] focus:border-[var(--success)]"
                : undefined
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SelectField label="Type" error={errors.type?.message}>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectField>
          )}
        />

        <Input label="Timezone" {...register("timezone")} error={errors.timezone?.message} />

        <Controller
          control={control}
          name="chapterId"
          render={({ field }) => (
            <SelectField label="Chapter (optional)" error={errors.chapterId?.message}>
              <Select value={field.value || "__none__"} onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No chapter</SelectItem>
                  {chapterOptions.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectField>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Start date & time"
          type="datetime-local"
          {...register("startAt")}
          error={errors.startAt?.message}
        />
        <Input
          label="End date & time"
          type="datetime-local"
          {...register("endAt")}
          error={errors.endAt?.message}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--r-md)] border border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="isOnline"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
              )}
            />
            <Label>Online event</Label>
          </div>
          <p className="mt-2 text-xs text-[var(--text-3)]">
            When enabled, attendees will join via your online URL.
          </p>
        </div>
        <Input
          label="Online URL"
          placeholder="https://meet.google.com/..."
          {...register("onlineUrl")}
          error={errors.onlineUrl?.message}
          disabled={!watchedOnline}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Location name" {...register("locationName")} error={errors.locationName?.message} />
        <Input label="Address" {...register("locationAddress")} error={errors.locationAddress?.message} />
        <Input label="City" {...register("locationCity")} error={errors.locationCity?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Textarea
          label="Description (Markdown supported)"
          rows={8}
          {...register("description")}
          error={errors.description?.message}
        />
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3">
          <p className="mb-2 text-sm font-medium text-[var(--text-1)]">Preview</p>
          <div className="prose prose-sm max-w-none text-[var(--text-2)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {watchedDescription?.trim() || "Description preview will appear here."}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bannerImage">Banner image</Label>
          <Input
            id="bannerImage"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(eventInput) => {
              const file = eventInput.target.files?.[0] ?? null;
              setBannerFile(file);
            }}
          />
          {selectedBannerFileName ? (
            <p className="text-xs text-[var(--text-3)]">{selectedBannerFileName}</p>
          ) : null}
          {event?.bannerUrl ? (
            <Image
              src={event.bannerUrl}
              alt={`${event.title} banner`}
              width={720}
              height={220}
              className="h-28 w-full rounded-[var(--r-md)] border border-[var(--border)] object-cover"
            />
          ) : null}
        </div>
        <Input
          label="Banner fallback color"
          placeholder="#1a3060"
          {...register("bannerColor")}
          error={errors.bannerColor?.message}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Input
          label="RSVP deadline"
          type="datetime-local"
          {...register("rsvpDeadline")}
          error={errors.rsvpDeadline?.message}
        />
        <Input
          label="Max attendees"
          placeholder="Optional"
          {...register("maxAttendees")}
          error={errors.maxAttendees?.message}
        />
        <Input label="Ticket price" {...register("ticketPrice")} error={errors.ticketPrice?.message} />
        <Input label="Currency" {...register("currency")} error={errors.currency?.message} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--r-md)] border border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="isFeatured"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
              )}
            />
            <Label>Featured event</Label>
          </div>
        </div>
        <div className="rounded-[var(--r-md)] border border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="isPublished"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
              )}
            />
            <Label>Published</Label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild type="button" variant="outline">
          <Link href="/admin/events">Cancel</Link>
        </Button>
        <Button
          type="submit"
          variant="navy"
          isLoading={isSubmitting}
          disabled={
            (!isDirty && mode === "edit") ||
            slugCheckState === "checking" ||
            slugCheckState === "taken"
          }
        >
          {mode === "create" ? "Create Event" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
