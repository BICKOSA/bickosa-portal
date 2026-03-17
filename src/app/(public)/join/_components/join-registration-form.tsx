"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const joinSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required."),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
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
    consentDataProcessing: z.boolean(),
    consentPolicyAgreement: z.boolean(),
    consentDirectory: z.boolean(),
    consentNewsletter: z.boolean(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((v) => v.consentDataProcessing, {
    path: ["consentDataProcessing"],
    message: "Data processing consent is required.",
  })
  .refine((v) => v.consentPolicyAgreement, {
    path: ["consentPolicyAgreement"],
    message: "You must agree to the Privacy Policy and Terms of Service.",
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

const steps = ["Identity & School", "About You & Consent"] as const;

export function JoinRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
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
    trigger,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      graduationYear: yearOptions[0] ?? new Date().getFullYear(),
      stream: "",
      house: "",
      notableTeachers: "",
      currentLocation: "",
      occupation: "",
      linkedinUrl: "",
      howTheyHeard: referralCode || "WhatsApp group",
      consentDataProcessing: false,
      consentPolicyAgreement: false,
      consentDirectory: true,
      consentNewsletter: true,
    },
  });

  const consentDataProcessing = watch("consentDataProcessing");
  const consentPolicyAgreement = watch("consentPolicyAgreement");
  const consentDirectory = watch("consentDirectory");
  const consentNewsletter = watch("consentNewsletter");

  const nextStep = async () => {
    const step1Fields: Array<keyof JoinValues> = [
      "fullName",
      "email",
      "password",
      "confirmPassword",
      "graduationYear",
    ];
    const valid = await trigger(step1Fields, { shouldFocus: true });
    if (valid) {
      setStep(1);
    }
  };

  const onSubmit = async (values: JoinValues) => {
    setFormError(null);

    const callbackURL =
      typeof window !== "undefined"
        ? `${window.location.origin}/verify-email?verified=true`
        : "/verify-email?verified=true";

    const nameParts = values.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const signUpResponse = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: values.fullName.trim(),
        email: values.email,
        password: values.password,
        callbackURL,
        rememberMe: false,
      }),
    });

    if (!signUpResponse.ok) {
      const body = (await signUpResponse.json().catch(() => null)) as {
        message?: string;
      } | null;
      setFormError(body?.message ?? "Failed to create account.");
      return;
    }

    const joinResponse = await fetch("/api/public/join-with-account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        firstName,
        lastName,
        graduationYear: values.graduationYear,
        stream: values.stream || null,
        house: values.house || null,
        notableTeachers: values.notableTeachers || null,
        currentLocation: values.currentLocation || null,
        occupation: values.occupation || null,
        linkedinUrl: values.linkedinUrl || null,
        howTheyHeard: referralCode || values.howTheyHeard || null,
        phone: values.phone || null,
        ref: referralCode || undefined,
        consent: {
          dataProcessing: values.consentDataProcessing,
          policyAgreement: values.consentPolicyAgreement,
          directory: values.consentDirectory,
          newsletter: values.consentNewsletter,
        },
      }),
    });

    if (!joinResponse.ok) {
      const body = (await joinResponse.json().catch(() => null)) as {
        message?: string;
      } | null;
      setFormError(body?.message ?? "Account created, but profile setup failed.");
      return;
    }

    router.push(`/join/success?email=${encodeURIComponent(values.email)}`);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
    >
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-ui)] text-3xl font-bold text-[var(--navy-900)]">
          Join the BICKOSA Community
        </h1>
        <p className="text-sm text-[var(--text-2)]">
          Create your alumni account and get verified to access the portal.
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
          Step {step + 1} of {steps.length}: {steps[step]}
        </p>
      </div>

      {step === 0 ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Full name"
              {...register("fullName")}
              error={errors.fullName?.message}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              error={errors.password?.message}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
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
        </>
      ) : null}

      {step === 1 ? (
        <>
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

          <div className="space-y-3 rounded-[var(--r-md)] border border-[var(--border-2)] bg-[var(--navy-50)] p-4">
            <p className="text-xs text-[var(--text-3)]">
              Please review our{" "}
              <Link
                href="/privacy-policy"
                className="font-medium text-[var(--navy-700)] underline"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                className="font-medium text-[var(--navy-700)] underline"
              >
                Terms of Service
              </Link>{" "}
              before submitting.
            </p>

            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Checkbox
                checked={consentPolicyAgreement}
                onCheckedChange={(checked) =>
                  setValue("consentPolicyAgreement", Boolean(checked), {
                    shouldValidate: true,
                  })
                }
              />
              I have read and agree to the Privacy Policy and Terms of Service.
            </label>
            {errors.consentPolicyAgreement?.message ? (
              <p className="text-xs text-[var(--error)]">
                {errors.consentPolicyAgreement.message}
              </p>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Checkbox
                checked={consentDataProcessing}
                onCheckedChange={(checked) =>
                  setValue("consentDataProcessing", Boolean(checked), {
                    shouldValidate: true,
                  })
                }
              />
              I consent to data processing in accordance with DPPA 2019 (required).
            </label>
            {errors.consentDataProcessing?.message ? (
              <p className="text-xs text-[var(--error)]">
                {errors.consentDataProcessing.message}
              </p>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Checkbox
                checked={consentDirectory}
                onCheckedChange={(checked) =>
                  setValue("consentDirectory", Boolean(checked))
                }
              />
              Show my profile in the alumni directory.
            </label>

            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Checkbox
                checked={consentNewsletter}
                onCheckedChange={(checked) =>
                  setValue("consentNewsletter", Boolean(checked))
                }
              />
              I consent to receive the monthly newsletter.
            </label>
          </div>
        </>
      ) : null}

      {formError ? (
        <p className="text-sm text-[var(--error)]">{formError}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setStep(0)}
          >
            Back
          </Button>
        ) : (
          <span />
        )}

        {step === 0 ? (
          <Button type="button" variant="navy" onClick={nextStep}>
            Continue
          </Button>
        ) : (
          <Button
            type="submit"
            variant="gold"
            className="w-full"
            isLoading={isSubmitting}
          >
            Join the Alumni Community
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-[var(--text-2)]">
        Already registered?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--navy-700)] underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
