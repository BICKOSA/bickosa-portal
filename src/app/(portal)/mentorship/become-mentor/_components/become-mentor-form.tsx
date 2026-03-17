"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MENTORSHIP_FOCUS_AREAS } from "@/lib/mentorship";
import { cn } from "@/lib/utils";

const becomeMentorSchema = z
  .object({
    isAvailable: z.boolean(),
    focusAreas: z.array(z.enum(MENTORSHIP_FOCUS_AREAS)).min(1, "Select at least one focus area."),
    maxMentees: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    contactMethod: z.union([z.literal("email"), z.literal("scheduling_link")]),
    schedulingUrl: z.union([z.literal(""), z.url("Enter a valid scheduling URL.")]),
    mentorshipBio: z
      .string()
      .trim()
      .min(10, "Mentorship bio should be at least 10 characters.")
      .max(280, "Mentorship bio must be 280 characters or less."),
  })
  .refine((value) => value.contactMethod === "email" || Boolean(value.schedulingUrl.trim()), {
    path: ["schedulingUrl"],
    message: "Add a scheduling URL when scheduling link is selected.",
  });

type BecomeMentorValues = z.infer<typeof becomeMentorSchema>;

type BecomeMentorFormProps = {
  initialValues: BecomeMentorValues;
};

export function BecomeMentorForm({ initialValues }: BecomeMentorFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BecomeMentorValues>({
    resolver: zodResolver(becomeMentorSchema),
    defaultValues: initialValues,
  });

  const selectedFocusAreas = watch("focusAreas") ?? [];
  const contactMethod = watch("contactMethod");
  const mentorshipBio = watch("mentorshipBio");

  function toggleFocusArea(focusArea: (typeof MENTORSHIP_FOCUS_AREAS)[number]) {
    const current = new Set(selectedFocusAreas);
    if (current.has(focusArea)) {
      current.delete(focusArea);
    } else {
      current.add(focusArea);
    }
    setValue("focusAreas", Array.from(current), { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: BecomeMentorValues) {
    const response = await fetch("/api/mentorship/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(body?.message ?? "Unable to update mentorship preferences.");
      return;
    }

    toast.success("Mentorship preferences updated.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentorship Availability</CardTitle>
        <CardDescription>
          Your name, job title, and focus areas will be visible to all verified members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <label className="flex items-center justify-between rounded-[var(--r-lg)] border border-[var(--border)] px-4 py-3">
            <span className="text-sm font-medium text-[var(--text-1)]">Make me available as a mentor</span>
            <input
              type="checkbox"
              className="size-4 accent-[var(--navy-900)]"
              {...register("isAvailable")}
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-1)]">Mentorship focus areas</p>
            <div className="flex flex-wrap gap-2">
              {MENTORSHIP_FOCUS_AREAS.map((focusArea) => {
                const selected = selectedFocusAreas.includes(focusArea);
                return (
                  <button
                    key={focusArea}
                    type="button"
                    onClick={() => toggleFocusArea(focusArea)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-[var(--navy-900)] bg-[var(--navy-900)] text-[var(--white)]"
                        : "border-[var(--border)] bg-[var(--white)] text-[var(--text-2)] hover:bg-[var(--navy-50)]",
                    )}
                  >
                    {focusArea}
                  </button>
                );
              })}
            </div>
            {errors.focusAreas?.message ? (
              <p className="mt-1 text-xs text-[var(--error)]">{errors.focusAreas.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="maxMentees"
              render={({ field }) => (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-[var(--text-1)]">Max mentees</p>
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => {
                      if (!value) {
                        return;
                      }
                      field.onChange(
                        Number.parseInt(value, 10) as BecomeMentorValues["maxMentees"],
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select max mentees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={control}
              name="contactMethod"
              render={({ field }) => (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-[var(--text-1)]">Preferred contact method</p>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="scheduling_link">Scheduling link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
          </div>

          <Input
            label="Scheduling URL (optional)"
            placeholder="https://calendly.com/your-link"
            {...register("schedulingUrl")}
            error={errors.schedulingUrl?.message}
            disabled={contactMethod === "email"}
          />

          <Textarea
            label="Short bio for mentorship"
            maxLength={280}
            {...register("mentorshipBio")}
            error={errors.mentorshipBio?.message}
            helperText={`${mentorshipBio.length}/280`}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="navy" isLoading={isSubmitting} disabled={!isDirty}>
              Save mentorship settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
