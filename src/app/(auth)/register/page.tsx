"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectField,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRY_OPTIONS } from "@/lib/auth/constants";

const registerSchema = z
  .object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    yearOfEntry: z.number().int().min(1900, "Enter a valid year."),
    yearOfCompletion: z.number().int().min(1900, "Enter a valid year."),
    currentJobTitle: z.string().min(1, "Current job title is required."),
    currentEmployer: z.string().min(1, "Current employer is required."),
    industry: z.string().min(1, "Select an industry."),
    locationCity: z.string().min(1, "City is required."),
    locationCountry: z.string().min(1, "Country is required."),
    consentDataProcessing: z.boolean(),
    consentDirectory: z.boolean(),
    consentNewsletter: z.boolean(),
    consentPhotography: z.boolean(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((value) => value.yearOfCompletion >= value.yearOfEntry + 3, {
    path: ["yearOfCompletion"],
    message: "Year of completion must be at least entry year + 3.",
  })
  .refine((value) => value.consentDataProcessing, {
    path: ["consentDataProcessing"],
    message: "Data processing consent is required.",
  });

type RegisterValues = z.infer<typeof registerSchema>;

const steps = [
  "Account",
  "About You",
  "Your Work",
  "Consent",
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    trigger,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      yearOfEntry: new Date().getFullYear() - 7,
      yearOfCompletion: new Date().getFullYear() - 3,
      currentJobTitle: "",
      currentEmployer: "",
      industry: "",
      locationCity: "",
      locationCountry: "Uganda",
      consentDataProcessing: false,
      consentDirectory: true,
      consentNewsletter: true,
      consentPhotography: false,
    },
  });

  const currentStepTitle = useMemo(() => steps[step], [step]);

  const nextStep = async () => {
    const stepFields: Array<Array<keyof RegisterValues>> = [
      ["email", "password", "confirmPassword"],
      ["firstName", "lastName", "yearOfEntry", "yearOfCompletion"],
      [
        "currentJobTitle",
        "currentEmployer",
        "industry",
        "locationCity",
        "locationCountry",
      ],
      ["consentDataProcessing", "consentDirectory", "consentNewsletter", "consentPhotography"],
    ];

    const valid = await trigger(stepFields[step], { shouldFocus: true });
    if (valid) {
      setStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);

    const callbackURL =
      typeof window !== "undefined"
        ? `${window.location.origin}/verify-email?verified=true`
        : "/verify-email?verified=true";

    const signUpResponse = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        password: values.password,
        callbackURL,
        rememberMe: false,
      }),
    });

    if (!signUpResponse.ok) {
      const body = (await signUpResponse.json().catch(() => null)) as
        | { message?: string }
        | null;
      setFormError(body?.message ?? "Failed to create account.");
      return;
    }

    const onboardingResponse = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        yearOfEntry: values.yearOfEntry,
        yearOfCompletion: values.yearOfCompletion,
        currentJobTitle: values.currentJobTitle,
        currentEmployer: values.currentEmployer,
        industry: values.industry,
        locationCity: values.locationCity,
        locationCountry: values.locationCountry,
        consent: {
          dataProcessing: values.consentDataProcessing,
          directory: values.consentDirectory,
          newsletter: values.consentNewsletter,
          photography: values.consentPhotography,
        },
      }),
    });

    if (!onboardingResponse.ok) {
      const body = (await onboardingResponse.json().catch(() => null)) as
        | { message?: string }
        | null;
      setFormError(body?.message ?? "Account created, but onboarding failed.");
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
  };

  const consentDataProcessing = watch("consentDataProcessing");
  const consentDirectory = watch("consentDirectory");
  const consentNewsletter = watch("consentNewsletter");
  const consentPhotography = watch("consentPhotography");

  return (
    <AuthPageShell>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--navy-900)]">Register</h2>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Create your verified BICKOSA alumni account.
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
            Step {step + 1} of {steps.length}: {currentStepTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {step === 0 ? (
            <>
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
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Input label="First name" {...register("firstName")} error={errors.firstName?.message} />
              <Input label="Last name" {...register("lastName")} error={errors.lastName?.message} />
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
            </>
          ) : null}

          {step === 2 ? (
            <>
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

              <Input label="City" {...register("locationCity")} error={errors.locationCity?.message} />
              <Input
                label="Country"
                {...register("locationCountry")}
                error={errors.locationCountry?.message}
              />
            </>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <Checkbox
                  checked={consentDataProcessing}
                  onCheckedChange={(checked) =>
                    setValue("consentDataProcessing", Boolean(checked), {
                      shouldValidate: true,
                    })
                  }
                />
                I consent to data processing (required).
              </label>
              {errors.consentDataProcessing?.message ? (
                <p className="text-xs text-[var(--error)]">{errors.consentDataProcessing.message}</p>
              ) : null}

              <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <Checkbox
                  checked={consentDirectory}
                  onCheckedChange={(checked) => setValue("consentDirectory", Boolean(checked))}
                />
                Show my profile in the alumni directory.
              </label>

              <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <Checkbox
                  checked={consentNewsletter}
                  onCheckedChange={(checked) => setValue("consentNewsletter", Boolean(checked))}
                />
                Send me newsletter updates.
              </label>

              <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <Checkbox
                  checked={consentPhotography}
                  onCheckedChange={(checked) => setValue("consentPhotography", Boolean(checked))}
                />
                I consent to photography usage.
              </label>
            </div>
          ) : null}

          {formError ? <p className="text-sm text-[var(--error)]">{formError}</p> : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || isSubmitting}
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            >
              Back
            </Button>

            {step < steps.length - 1 ? (
              <Button type="button" variant="gold" onClick={nextStep}>
                Continue
              </Button>
            ) : (
              <Button type="submit" variant="gold" isLoading={isSubmitting}>
                Create account
              </Button>
            )}
          </div>
        </form>

        <p className="text-center text-sm text-[var(--text-2)]">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-[var(--navy-700)] underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
