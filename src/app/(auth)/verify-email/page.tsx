"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VerifyState = "pending" | "verifying" | "verified" | "error";

function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [state, setState] = useState<VerifyState>("pending");
  const [message, setMessage] = useState<string | null>(null);

  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const error = useMemo(() => searchParams.get("error"), [searchParams]);
  const verified = useMemo(() => searchParams.get("verified"), [searchParams]);

  useEffect(() => {
    if (verified === "true") {
      setState("verifying");
      setMessage("Email verified. Redirecting to your portal...");

      const redirectIfSignedIn = async () => {
        const sessionResponse = await fetch("/api/auth/get-session");
        if (!sessionResponse.ok) {
          setState("verified");
          setMessage("Email verified successfully. You can now sign in.");
          return;
        }

        const payload = (await sessionResponse.json().catch(() => null)) as
          | { user?: unknown }
          | null;

        if (payload?.user) {
          router.replace("/dashboard");
          return;
        }

        setState("verified");
        setMessage("Email verified successfully. You can now sign in.");
      };

      void redirectIfSignedIn();
      return;
    }

    if (error) {
      setState("error");
      setMessage("Verification link is invalid or expired.");
      return;
    }

    let cancelled = false;

    const verifyToken = async () => {
      if (!token) {
        return;
      }

      setState("verifying");
      setMessage(null);

      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      if (cancelled) {
        return;
      }

      if (response.ok) {
        setState("verified");
        setMessage("Email verified successfully. You can now sign in.");
        return;
      }

      setState("error");
      setMessage("Verification link is invalid or expired.");
    };

    verifyToken();
    return () => {
      cancelled = true;
    };
  }, [error, router, token, verified]);

  const resendVerificationEmail = async () => {
    if (!email) {
      setMessage("Enter your email to resend the verification link.");
      return;
    }

    setMessage(null);
    const callbackURL =
      typeof window !== "undefined"
        ? `${window.location.origin}/verify-email?verified=true`
        : "/verify-email?verified=true";

    const response = await fetch("/api/auth/send-verification-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, callbackURL }),
    });

    if (response.ok) {
      setMessage("Verification email sent.");
      return;
    }

    setMessage("Unable to send verification email. Try again shortly.");
  };

  return (
    <AuthPageShell>
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--navy-900)]">Verify email</h2>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Confirm your email address to activate your account.
          </p>
        </div>

        {state === "pending" || state === "verifying" ? (
          <p className="rounded-[var(--r-md)] bg-[var(--navy-50)] px-3 py-2 text-sm text-[var(--text-2)]">
            {state === "verifying"
              ? "Verifying your email..."
              : "Check your inbox and click the verification link."}
          </p>
        ) : null}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />

        {message ? (
          <p
            className={`text-sm ${
              state === "verified" ? "text-[var(--success)]" : "text-[var(--text-2)]"
            }`}
          >
            {message}
          </p>
        ) : null}

        <Button type="button" variant="navy" className="w-full" onClick={resendVerificationEmail}>
          Resend email
        </Button>

        <p className="text-center text-sm text-[var(--text-2)]">
          Continue to{" "}
          <Link href="/login" className="font-medium text-[var(--navy-700)] underline">
            Login
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
