"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trackPortalEventClient } from "@/lib/analytics/client";
import { authClient } from "@/lib/auth/auth-client";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;
type SocialProvider = "google" | "linkedin";

function GoogleLogo() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.95-2.18l-2.91-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.68H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V9H7.1v11.45ZM22.23 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0Z"
      />
    </svg>
  );
}

function normalizeReturnTo(returnTo: string | null): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/dashboard";
  }

  const normalized = returnTo.replace(/^\/portal(?=\/|$)/, "");
  return normalized || "/dashboard";
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const oauthError = searchParams.get("error");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);

    const response = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setFormError(body?.message ?? "Invalid credentials.");
      return;
    }

    await trackPortalEventClient({
      event: "user_login",
      properties: {
        method: "email",
      },
    });

    const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
    router.push(returnTo);
  };

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setFormError(null);
    setBusyProvider(provider);

    const returnTo = normalizeReturnTo(searchParams.get("returnTo"));

    await trackPortalEventClient({
      event: "user_login",
      properties: {
        method: provider,
      },
    }).catch(() => undefined);

    const result = await authClient.signIn.social({
      provider,
      callbackURL: returnTo,
      errorCallbackURL: `/login?returnTo=${encodeURIComponent(returnTo)}&error=${provider}`,
    });

    if (result.error) {
      setFormError(
        result.error.message ?? "Social sign-in could not be started.",
      );
      setBusyProvider(null);
    }
  };

  const isGoogleBusy = busyProvider === "google";
  const isLinkedInBusy = busyProvider === "linkedin";
  const isSocialBusy = busyProvider !== null;

  return (
    <AuthPageShell variant="immersive">
      <div className="mx-auto w-full max-w-md space-y-6 text-center">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--navy-900)]">
            Sign in to your portal
          </h2>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full border-[var(--border-2)] bg-[var(--white)] text-[var(--navy-900)] shadow-[var(--shadow-sm)] hover:border-[var(--navy-200)] hover:bg-[var(--navy-50)]"
          isLoading={isGoogleBusy}
          disabled={isSubmitting || isSocialBusy}
          onClick={() => void handleSocialSignIn("google")}
        >
          {!isGoogleBusy ? <GoogleLogo /> : null}
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full border-[var(--border-2)] bg-[var(--white)] text-[var(--navy-900)] shadow-[var(--shadow-sm)] hover:border-[var(--navy-200)] hover:bg-[var(--navy-50)]"
          isLoading={isLinkedInBusy}
          disabled={isSubmitting || isSocialBusy}
          onClick={() => void handleSocialSignIn("linkedin")}
        >
          {!isLinkedInBusy ? <LinkedInLogo /> : null}
          Continue with LinkedIn
        </Button>

        <div className="flex items-center gap-3 text-xs font-medium tracking-[0.16em] text-[var(--text-3)] uppercase">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span>or use email</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
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
            autoComplete="current-password"
            {...register("password")}
            error={errors.password?.message}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(checked) =>
                  setValue("rememberMe", Boolean(checked))
                }
              />
              Remember me for 30 days
            </label>

            <Link
              href="/forgot-password"
              className="text-sm text-[var(--navy-700)] underline"
            >
              Forgot password?
            </Link>
          </div>

          {formError ? (
            <p className="text-sm text-[var(--error)]">{formError}</p>
          ) : null}
          {!formError && oauthError ? (
            <p className="text-sm text-[var(--error)]">
              Social sign-in could not be completed. Please try again.
            </p>
          ) : null}

          <Button
            type="submit"
            variant="gold"
            className="w-full"
            isLoading={isSubmitting}
          >
            Sign In
          </Button>
        </form>

        <p className="rounded-[var(--r-lg)] bg-[var(--navy-50)] px-4 py-3 text-center text-sm text-[var(--text-2)]">
          No account yet?{" "}
          <Link
            href="/register"
            className="font-medium text-[var(--navy-700)] underline"
          >
            Register
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
