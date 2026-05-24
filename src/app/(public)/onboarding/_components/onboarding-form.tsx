"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
const LINKEDIN_URL_REGEX = /linkedin\.com\//i;

const onboardingSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name is required.")
      .max(120)
      .refine(
        (value) => value.split(/\s+/).filter(Boolean).length >= 2,
        { message: "Please enter both your first and last name." },
      ),
    phone: z
      .string()
      .trim()
      .min(7, "Phone number is required.")
      .max(20)
      .regex(PHONE_REGEX, "Enter a valid phone number."),
    graduationYear: z
      .number({ error: "Choose your graduation year." })
      .int()
      .min(1999)
      .max(new Date().getFullYear() + 1),
    stream: z.string().trim().max(120).optional(),
    house: z.string().trim().max(120).optional(),
    notableTeachers: z
      .string()
      .trim()
      .min(3, "Name a teacher or classmate — helps us verify you.")
      .max(500),
    currentLocation: z
      .string()
      .trim()
      .min(3, "Where are you based today? (City, country)")
      .max(255),
    occupation: z
      .string()
      .trim()
      .min(2, "What do you currently do?")
      .max(255),
    linkedinUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .url("Enter a valid LinkedIn URL.")
          .regex(LINKEDIN_URL_REGEX, "Use the URL to your LinkedIn profile (linkedin.com/…)"),
      ])
      .optional(),
    howTheyHeard: z
      .string()
      .trim()
      .min(1, "Let us know how you heard about us.")
      .max(255),
    consentDataProcessing: z.boolean(),
    consentPolicyAgreement: z.boolean(),
    consentDirectory: z.boolean(),
    consentNewsletter: z.boolean(),
  })
  .refine((v) => v.consentDataProcessing, {
    path: ["consentDataProcessing"],
    message: "Data processing consent is required.",
  })
  .refine((v) => v.consentPolicyAgreement, {
    path: ["consentPolicyAgreement"],
    message: "You must agree to the Privacy Policy and Terms of Service.",
  });

type OnboardingValues = z.infer<typeof onboardingSchema>;

const hearOptions = [
  "WhatsApp group",
  "Friend",
  "Sports League",
  "Events/Gala",
  "Social media",
  "Chapter referral",
  "Other",
];

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-[var(--error)]">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

function FieldHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="inline-flex size-4 items-center justify-center rounded-full text-[var(--text-3)] transition hover:text-[var(--navy-700)] focus:text-[var(--navy-700)] focus:outline-none"
          >
            <Info aria-hidden="true" className="size-3.5" />
          </button>
        }
      />
      <TooltipContent className="max-w-[260px] text-left leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function LabelWithHint({
  children,
  hint,
  required,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{children}</span>
      {required ? <RequiredMark /> : null}
      {hint ? (
        <FieldHint
          label={`More about ${typeof children === "string" ? children : "this field"}`}
        >
          {hint}
        </FieldHint>
      ) : null}
    </span>
  );
}

type OnboardingFormProps = {
  defaultName: string;
  email: string;
};

export function OnboardingForm({ defaultName, email }: OnboardingFormProps) {
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: defaultName,
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

  const onSubmit = async (values: OnboardingValues) => {
    setFormError(null);

    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: values.fullName.trim().replace(/\s+/g, " "),
        graduationYear: values.graduationYear,
        stream: values.stream || null,
        house: values.house || null,
        notableTeachers: values.notableTeachers.trim(),
        currentLocation: values.currentLocation.trim(),
        occupation: values.occupation.trim(),
        linkedinUrl: values.linkedinUrl?.trim() || null,
        howTheyHeard: referralCode || values.howTheyHeard,
        phone: values.phone.trim(),
        ref: referralCode || undefined,
        consent: {
          dataProcessing: values.consentDataProcessing,
          policyAgreement: values.consentPolicyAgreement,
          directory: values.consentDirectory,
          newsletter: values.consentNewsletter,
        },
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setFormError(body?.message ?? "Failed to complete onboarding.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <TooltipProvider delay={150}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-ui)] text-3xl font-bold text-[var(--navy-900)]">
            Finish setting up your BICKOSA profile
          </h1>
          <p className="text-sm text-[var(--text-2)]">
            We need a few details to verify you and connect you with your
            cohort. You can&apos;t access the portal until this is complete and
            our team has approved your alumni status.
          </p>
          {email ? (
            <p className="text-xs text-[var(--text-3)]">
              Signed in as <span className="font-medium">{email}</span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label={
              <LabelWithHint
                required
                hint="Your name on school records. If it's changed since BCK, use the school-record name first."
              >
                Full name
              </LabelWithHint>
            }
            autoComplete="name"
            placeholder="e.g. Mary Nakato"
            {...register("fullName")}
            error={errors.fullName?.message}
            helperText="First and last name as on your records."
          />
          <Input
            label={
              <LabelWithHint
                required
                hint="Add the country code (e.g. +256 for Uganda). Used for chapter outreach and (later) SMS alerts. Private by default."
              >
                Phone
              </LabelWithHint>
            }
            type="tel"
            autoComplete="tel"
            placeholder="e.g. +256 772 000 000"
            {...register("phone")}
            error={errors.phone?.message}
            helperText="Include the country code if not in Uganda."
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            <span>
              <LabelWithHint
                required
                hint="The year you completed your final year at Bishop Cipriano Kihangire (usually S6, or S4 if you left after O-level)."
              >
                Graduation year
              </LabelWithHint>
            </span>
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
            {errors.graduationYear?.message ? (
              <p className="text-xs text-[var(--error)]">
                {errors.graduationYear.message}
              </p>
            ) : null}
          </label>
          <Input
            label={
              <LabelWithHint hint="Your academic class group in upper school — e.g. PCM, PCB, MEG, HEG.">
                Stream <span className="text-[var(--text-3)]">(optional)</span>
              </LabelWithHint>
            }
            {...register("stream")}
            error={errors.stream?.message}
            helperText="e.g. Sciences, Arts."
          />
          <Input
            label={
              <LabelWithHint hint="The boarding or competition house you belonged to at BCK.">
                House <span className="text-[var(--text-3)]">(optional)</span>
              </LabelWithHint>
            }
            {...register("house")}
            error={errors.house?.message}
          />
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          <span>
            <LabelWithHint
              required
              hint="Helps our verification team match you to school records. One familiar name is enough — a class teacher, prefect, sports captain, or close friend."
            >
              Name a teacher or classmate you remember
            </LabelWithHint>
          </span>
          <textarea
            {...register("notableTeachers")}
            rows={3}
            className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)] aria-[invalid=true]:border-[var(--error)]"
            aria-invalid={Boolean(errors.notableTeachers)}
            placeholder="This helps us verify school records."
          />
          {errors.notableTeachers?.message ? (
            <p className="text-xs text-[var(--error)]">
              {errors.notableTeachers.message}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-3)]">
              A teacher&apos;s name, a class prefect, a sports captain — anything
              that helps us match your record.
            </p>
          )}
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label={
              <LabelWithHint
                required
                hint="Where you live now. Drives chapter assignment."
              >
                Current location
              </LabelWithHint>
            }
            autoComplete="address-level2"
            placeholder="e.g. Kampala, Uganda"
            {...register("currentLocation")}
            error={errors.currentLocation?.message}
            helperText="City and country — used to assign you to a chapter."
          />
          <Input
            label={
              <LabelWithHint
                required
                hint="What you do today — title plus employer/organisation. Helps mentorship and directory matching."
              >
                Occupation
              </LabelWithHint>
            }
            autoComplete="organization-title"
            placeholder="e.g. Software Engineer at Google"
            {...register("occupation")}
            error={errors.occupation?.message}
            helperText="Title and employer help peers find and support each other."
          />
          <Input
            label={
              <LabelWithHint hint="The public URL to your LinkedIn profile. Shown on your directory entry if you opt in.">
                LinkedIn <span className="text-[var(--text-3)]">(optional)</span>
              </LabelWithHint>
            }
            type="url"
            autoComplete="url"
            placeholder="https://www.linkedin.com/in/your-name"
            {...register("linkedinUrl")}
            error={errors.linkedinUrl?.message}
            helperText="Full URL — must contain linkedin.com."
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            <span>
              <LabelWithHint
                required
                hint="Helps us understand which channels reach alumni best — and credit referrers."
              >
                How did you hear about us?
              </LabelWithHint>
            </span>
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
            {errors.howTheyHeard?.message ? (
              <p className="text-xs text-[var(--error)]">
                {errors.howTheyHeard.message}
              </p>
            ) : null}
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

          <label className="flex items-start gap-2 text-sm text-[var(--text-2)]">
            <Checkbox
              checked={consentDirectory}
              onCheckedChange={(checked) =>
                setValue("consentDirectory", Boolean(checked))
              }
            />
            <span className="inline-flex flex-wrap items-center gap-1.5">
              Show my profile in the alumni directory.
              <FieldHint label="What appears in the directory">
                Other verified alumni see your name, graduation year, current
                city, occupation, and (if filled) your LinkedIn link. Your
                email and phone stay private.
              </FieldHint>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-2)]">
            <Checkbox
              checked={consentNewsletter}
              onCheckedChange={(checked) =>
                setValue("consentNewsletter", Boolean(checked))
              }
            />
            <span className="inline-flex flex-wrap items-center gap-1.5">
              I consent to receive the monthly newsletter.
              <FieldHint label="About the newsletter">
                One roundup each month — upcoming events, election cycles,
                mentorship opportunities, and chapter updates. Unsubscribe any
                time from the email footer.
              </FieldHint>
            </span>
          </label>
        </div>

        {formError ? (
          <p className="text-sm text-[var(--error)]">{formError}</p>
        ) : null}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="gold"
            className="w-full"
            isLoading={isSubmitting}
          >
            Complete onboarding
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
