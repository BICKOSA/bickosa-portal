"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const joinSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.email("Enter a valid email address."),
  phone: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^\+?[0-9()\-\s]{7,20}$/, "Enter a valid phone number."),
    ])
    .optional(),
  graduationYear: z
    .number()
    .int()
    .min(1999)
    .max(new Date().getFullYear() + 1),
  stream: z.string().trim().max(120).optional(),
  house: z.string().trim().max(120).optional(),
  notableTeachers: z.string().trim().max(500).optional(),
  currentLocation: z.string().trim().max(255).optional(),
  occupation: z.string().trim().max(255).optional(),
  linkedinUrl: z
    .union([z.literal(""), z.url("Enter a valid LinkedIn URL.")])
    .optional(),
  howTheyHeard: z.string().trim().max(255).optional(),
});

type JoinValues = z.infer<typeof joinSchema>;

const hearOptions = [
  "WhatsApp group",
  "Friend",
  "Sports League",
  "Events/Gala",
  "Social media",
  "Chapter referral",
  "Other",
];

export function JoinRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const referralCode = searchParams.get("ref")?.trim() ?? "";
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let year = current; year >= 1999; year -= 1) {
      years.push(year);
    }
    return years;
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      graduationYear: yearOptions[0] ?? new Date().getFullYear(),
      stream: "",
      house: "",
      notableTeachers: "",
      currentLocation: "",
      occupation: "",
      linkedinUrl: "",
      howTheyHeard: referralCode || "WhatsApp group",
    },
  });

  const onSubmit = async (values: JoinValues) => {
    setFormError(null);
    const response = await fetch("/api/public/join", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...values,
        ref: referralCode || undefined,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setFormError(body?.message ?? "Could not submit your registration.");
      return;
    }

    router.push("/join/success");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-[var(--font-ui)] font-bold text-[var(--navy-900)]">
          Join the BICKOSA Community
        </h1>
        <p className="text-sm text-[var(--text-2)]">
          Share your details for verification and we will guide you into the
          portal.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Full name"
          {...register("fullName")}
          error={errors.fullName?.message}
        />
        <Input
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
        />
        <Input
          label="Phone (optional)"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Graduation year
          <select
            {...register("graduationYear", { valueAsNumber: true })}
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Stream (optional)"
          {...register("stream")}
          error={errors.stream?.message}
        />
        <Input
          label="House (optional)"
          {...register("house")}
          error={errors.house?.message}
        />
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
        Name a teacher or classmate you remember
        <textarea
          {...register("notableTeachers")}
          rows={3}
          className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          placeholder="This helps us verify school records."
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Current location (optional)"
          {...register("currentLocation")}
        />
        <Input label="Occupation (optional)" {...register("occupation")} />
        <Input
          label="LinkedIn (optional)"
          {...register("linkedinUrl")}
          error={errors.linkedinUrl?.message}
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          How did you hear about us?
          <select
            {...register("howTheyHeard")}
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          >
            {hearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-[var(--r-md)] border border-[var(--border-2)] bg-[var(--navy-50)] p-3 text-xs text-[var(--text-2)]">
        By submitting, you consent to BICKOSA using this information for
        membership verification, communication about your registration, and
        portal onboarding in accordance with Uganda&apos;s Data Protection and
        Privacy Act 2019.
      </div>

      {formError ? (
        <p className="text-sm text-[var(--error)]">{formError}</p>
      ) : null}

      <Button
        type="submit"
        variant="gold"
        className="w-full"
        isLoading={isSubmitting}
      >
        Join the Alumni Community
      </Button>
    </form>
  );
}
