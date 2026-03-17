"use client";

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
import { jobTypeOptions } from "@/lib/careers";
import { formatJobTypeLabel } from "@/lib/careers";

const newJobSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    company: z.string().trim().min(1, "Company is required."),
    description: z.string().trim().min(40, "Description should be at least 40 characters."),
    type: z.enum(jobTypeOptions),
    locationCity: z.string().trim().optional(),
    locationCountry: z.string().trim().optional(),
    isRemote: z.boolean(),
    salary: z.string().trim().optional(),
    applyUrl: z.union([z.literal(""), z.url("Provide a valid URL.")]),
    applyEmail: z.union([z.literal(""), z.email("Provide a valid email address.")]),
    expiresAt: z.string().min(1, "Expiry date is required."),
  })
  .refine((value) => Boolean(value.applyUrl || value.applyEmail), {
    path: ["applyUrl"],
    message: "Provide either an application URL or an email.",
  });

type NewJobFormValues = z.infer<typeof newJobSchema>;

type PostJobFormProps = {
  isVerifiedMember: boolean;
};

function toDateTimeLocalFromNow(days = 21): string {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  value.setSeconds(0);
  value.setMilliseconds(0);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function PostJobForm({ isVerifiedMember }: PostJobFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewJobFormValues>({
    resolver: zodResolver(newJobSchema),
    defaultValues: {
      title: "",
      company: "",
      description: "",
      type: "fulltime",
      locationCity: "",
      locationCountry: "",
      isRemote: false,
      salary: "",
      applyUrl: "",
      applyEmail: "",
      expiresAt: toDateTimeLocalFromNow(),
    },
  });

  const watchedDescription = watch("description");
  const watchedIsRemote = watch("isRemote");

  async function onSubmit(values: NewJobFormValues) {
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("company", values.company);
    formData.set("description", values.description);
    formData.set("type", values.type);
    formData.set("locationCity", values.locationCity ?? "");
    formData.set("locationCountry", values.locationCountry ?? "");
    formData.set("isRemote", String(values.isRemote));
    formData.set("salary", values.salary ?? "");
    formData.set("applyUrl", values.applyUrl);
    formData.set("applyEmail", values.applyEmail);
    formData.set("expiresAt", values.expiresAt);

    const response = await fetch("/api/careers/jobs", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast({
        title: "Could not submit posting",
        description: body?.message ?? "Please review the form and try again.",
      });
      return;
    }

    toast({
      title: "Job posting submitted",
      description: "Your posting will be reviewed by our team before going live.",
      variant: "success",
    });
    router.push("/careers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!isVerifiedMember ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--navy-50)] p-4 text-sm text-[var(--text-2)]">
          Verified members only can post jobs. Please complete your profile verification first.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Job title" {...register("title")} error={errors.title?.message} />
        <Input label="Company" {...register("company")} error={errors.company?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SelectField label="Type" error={errors.type?.message}>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  {jobTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatJobTypeLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectField>
          )}
        />
        <Input
          label="Location city"
          {...register("locationCity")}
          error={errors.locationCity?.message}
          disabled={watchedIsRemote}
        />
        <Input
          label="Location country"
          {...register("locationCountry")}
          error={errors.locationCountry?.message}
          disabled={watchedIsRemote}
        />
      </div>

      <div className="rounded-[var(--r-md)] border border-[var(--border)] p-3">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="isRemote"
            render={({ field }) => (
              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
            )}
          />
          <Label>This job is remote</Label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Salary range (optional)"
          placeholder="UGX 3,000,000 - 4,000,000 / month"
          {...register("salary")}
          error={errors.salary?.message}
        />
        <Input
          label="Expires at"
          type="datetime-local"
          {...register("expiresAt")}
          error={errors.expiresAt?.message}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Application URL (optional)"
          placeholder="https://company.com/jobs/apply"
          {...register("applyUrl")}
          error={errors.applyUrl?.message}
        />
        <Input
          label="Application email (optional)"
          placeholder="careers@company.com"
          {...register("applyEmail")}
          error={errors.applyEmail?.message}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          label="Job description (Markdown supported)"
          rows={10}
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

      <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-2)]">
        Your posting will be reviewed by our team before going live.
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline" type="button">
          <Link href="/careers">Cancel</Link>
        </Button>
        <Button type="submit" variant="navy" isLoading={isSubmitting} disabled={!isVerifiedMember}>
          Submit for Review
        </Button>
      </div>
    </form>
  );
}
