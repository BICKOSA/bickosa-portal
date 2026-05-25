"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import type { AdminCampaignDetail, CampaignProjectType } from "@/lib/admin-campaigns";

const PROJECT_TYPES: CampaignProjectType[] = [
  "academic_block",
  "ict_lab",
  "scholarship",
  "sports",
  "general",
];

const campaignFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens."),
    description: z.string().optional(),
    projectType: z.enum(PROJECT_TYPES),
    goalAmount: z.string().regex(/^\d+$/, "Goal amount must be a whole number."),
    currency: z.string().trim().min(1, "Currency is required."),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean(),
    bannerColor: z.string().optional(),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.endDate ||
      new Date(value.endDate).getTime() >= new Date(value.startDate).getTime(),
    {
      path: ["endDate"],
      message: "End date must be after start date.",
    },
  );

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

type CampaignFormProps = {
  mode: "create" | "edit";
  campaign?: AdminCampaignDetail;
};

function toDateInput(value: Date | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toDefaults(campaign?: AdminCampaignDetail): CampaignFormValues {
  return {
    title: campaign?.title ?? "",
    slug: campaign?.slug ?? "",
    description: campaign?.description ?? "",
    projectType: campaign?.projectType ?? "general",
    goalAmount: campaign ? String(campaign.goalAmount) : "",
    currency: campaign?.currency ?? "UGX",
    startDate: toDateInput(campaign?.startDate ?? null),
    endDate: toDateInput(campaign?.endDate ?? null),
    isActive: campaign?.isActive ?? true,
    bannerColor: campaign?.bannerColor ?? "#1a3060",
    isFeatured: campaign?.isFeatured ?? false,
    isPublished: campaign?.isPublished ?? false,
  };
}

export function CampaignForm({ mode, campaign }: CampaignFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSlugTouched, setIsSlugTouched] = useState(mode === "edit");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [slugCheckState, setSlugCheckState] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  );
  const [slugHelperText, setSlugHelperText] = useState<string>("");

  const defaultValues = useMemo(() => toDefaults(campaign), [campaign]);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues,
  });

  const watchedTitle = watch("title");
  const watchedDescription = watch("description");
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
        if (campaign?.id) {
          query.set("excludeId", campaign.id);
        }
        const response = await fetch(`/api/admin/campaigns/slug?${query.toString()}`, {
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
  }, [campaign?.id, setValue, watchedSlug]);

  async function onSubmit(values: CampaignFormValues) {
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("slug", values.slug);
    formData.set("description", values.description ?? "");
    formData.set("projectType", values.projectType);
    formData.set("goalAmount", values.goalAmount);
    formData.set("currency", values.currency);
    formData.set("startDate", values.startDate ?? "");
    formData.set("endDate", values.endDate ?? "");
    formData.set("isActive", String(values.isActive));
    formData.set("bannerColor", values.bannerColor ?? "");
    formData.set("isFeatured", String(values.isFeatured));
    formData.set("isPublished", String(values.isPublished));
    if (bannerFile) {
      formData.set("bannerImage", bannerFile);
    }

    const endpoint = mode === "create" ? "/api/admin/campaigns" : `/api/admin/campaigns/${campaign?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      toast({
        title: "Could not save campaign",
        description: payload?.message ?? "Please try again.",
      });
      return;
    }

    const payload = (await response.json()) as { id: string };
    toast({
      title: mode === "create" ? "Campaign created" : "Campaign updated",
      variant: "success",
    });
    if (mode === "create") {
      router.push(`/admin/campaigns/${payload.id}/edit`);
      router.refresh();
      return;
    }
    router.push("/admin/campaigns");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" {...register("title")} error={errors.title?.message} />
        <Input
          label="Slug"
          {...register("slug")}
          error={errors.slug?.message}
          helperText={
            errors.slug?.message
              ? undefined
              : slugHelperText || "Lowercase letters, numbers, and hyphens only."
          }
          onChange={(event) => {
            setIsSlugTouched(true);
            setValue("slug", slugify(event.target.value), { shouldDirty: true });
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="projectType"
          render={({ field }) => (
            <SelectField label="Project type" error={errors.projectType?.message}>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectField>
          )}
        />
        <Input label="Currency" {...register("currency")} error={errors.currency?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Goal amount (UGX)" {...register("goalAmount")} error={errors.goalAmount?.message} />
        <Input label="Start date" type="date" {...register("startDate")} error={errors.startDate?.message} />
        <Input label="End date" type="date" {...register("endDate")} error={errors.endDate?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Textarea
          label="Description (Markdown)"
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
          <Label htmlFor="campaignBanner">Banner image</Label>
          <Input
            id="campaignBanner"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)}
          />
          {bannerFile ? <p className="text-xs text-[var(--text-3)]">{bannerFile.name}</p> : null}
          {campaign?.bannerUrl ? (
            <Image
              src={campaign.bannerUrl}
              alt={`${campaign.title} banner`}
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

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["isActive", "Active campaign"],
            ["isFeatured", "Featured campaign"],
            ["isPublished", "Published"],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="rounded-[var(--r-md)] border border-[var(--border)] p-3">
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name={name}
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                )}
              />
              <Label>{label}</Label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button asChild type="button" variant="outline">
          <Link href="/admin/campaigns">Cancel</Link>
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
          {mode === "create" ? "Create Campaign" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
