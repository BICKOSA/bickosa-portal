"use client";

import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { INDUSTRY_OPTIONS } from "@/lib/auth/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectField,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileViewData } from "@/app/(portal)/profile/_components/types";

const profileSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    yearOfEntry: z.number().int().min(1900, "Enter a valid year."),
    yearOfCompletion: z.number().int().min(1900, "Enter a valid year."),
    currentJobTitle: z.string().trim().min(1, "Current job title is required."),
    currentEmployer: z.string().trim().min(1, "Current employer is required."),
    industry: z.string().trim().min(1, "Select an industry."),
    locationCity: z.string().trim().min(1, "City is required."),
    locationCountry: z.string().trim().min(1, "Country is required."),
    phone: z.union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^\+?[0-9()\-\s]{7,20}$/, "Enter a valid phone number."),
    ]),
    bio: z.string().trim().max(280, "Bio must be 280 characters or less.").optional(),
    linkedinUrl: z.union([z.literal(""), z.url("Enter a valid LinkedIn URL.")]),
    websiteUrl: z.union([z.literal(""), z.url("Enter a valid website URL.")]),
  })
  .refine((value) => value.yearOfCompletion >= value.yearOfEntry + 3, {
    path: ["yearOfCompletion"],
    message: "Year of completion must be at least entry year + 3.",
  });

type PersonalInfoValues = z.infer<typeof profileSchema>;

type PersonalInfoFormProps = {
  profile: ProfileViewData;
  onProfileUpdated: (profile: ProfileViewData) => void;
};

function toFormDefaults(profile: ProfileViewData): PersonalInfoValues {
  const currentYear = new Date().getFullYear();
  const fallbackEntry = currentYear - 7;
  const fallbackCompletion = currentYear - 3;

  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    yearOfEntry: profile.yearOfEntry ?? fallbackEntry,
    yearOfCompletion: profile.yearOfCompletion ?? fallbackCompletion,
    currentJobTitle: profile.currentJobTitle ?? "",
    currentEmployer: profile.currentEmployer ?? "",
    industry: profile.industry ?? "",
    locationCity: profile.locationCity ?? "",
    locationCountry: profile.locationCountry ?? "Uganda",
    phone: profile.phone ?? "",
    bio: profile.bio ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    websiteUrl: profile.websiteUrl ?? "",
  };
}

export function PersonalInfoForm({ profile, onProfileUpdated }: PersonalInfoFormProps) {
  const defaultValues = useMemo(() => toFormDefaults(profile), [profile]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PersonalInfoValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const bioValue = watch("bio") ?? "";

  async function onSubmit(values: PersonalInfoValues) {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(body?.message ?? "Failed to update profile.");
      return;
    }

    const body = (await response.json()) as { profile: ProfileViewData };
    onProfileUpdated(body.profile);
    reset(toFormDefaults(body.profile));
    toast.success("Profile updated successfully.");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Keep your alumni profile current and accurate.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isDirty || isSubmitting}
              onClick={() => reset(defaultValues)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="personal-info-form"
              variant="navy"
              size="sm"
              isLoading={isSubmitting}
              disabled={!isDirty}
            >
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form id="personal-info-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" {...register("firstName")} error={errors.firstName?.message} />
            <Input label="Last name" {...register("lastName")} error={errors.lastName?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Year of entry"
              type="number"
              {...register("yearOfEntry", { valueAsNumber: true })}
              error={errors.yearOfEntry?.message}
            />
            <Input
              label="Year of completion"
              type="number"
              {...register("yearOfCompletion", { valueAsNumber: true })}
              error={errors.yearOfCompletion?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Current job title"
              {...register("currentJobTitle")}
              error={errors.currentJobTitle?.message}
            />
            <Input
              label="Current employer"
              {...register("currentEmployer")}
              error={errors.currentEmployer?.message}
            />
          </div>

          <Controller
            control={control}
            name="industry"
            render={({ field }) => (
              <SelectField label="Industry" error={errors.industry?.message}>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectField>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="City" {...register("locationCity")} error={errors.locationCity?.message} />
            <Input
              label="Country"
              {...register("locationCountry")}
              error={errors.locationCountry?.message}
            />
          </div>

          <Input
            label="Phone number"
            placeholder="+256 7XX XXX XXX"
            {...register("phone")}
            error={errors.phone?.message}
          />

          <Textarea
            label="Bio"
            maxLength={280}
            {...register("bio")}
            error={errors.bio?.message}
            helperText={`${bioValue.length}/280`}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="LinkedIn URL"
              placeholder="https://linkedin.com/in/your-profile"
              {...register("linkedinUrl")}
              error={errors.linkedinUrl?.message}
            />
            <Input
              label="Website URL"
              placeholder="https://your-website.com"
              {...register("websiteUrl")}
              error={errors.websiteUrl?.message}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
