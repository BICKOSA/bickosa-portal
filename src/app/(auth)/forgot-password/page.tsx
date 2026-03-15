"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setMessage(null);
    setFormError(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "/reset-password";

    const response = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        redirectTo,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setFormError(body?.message ?? "Could not send reset link.");
      return;
    }

    setMessage("If that email exists, a reset link has been sent.");
  };

  return (
    <AuthPageShell>
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--navy-900)]">Forgot password</h2>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            We will send a secure password reset link to your email.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />

          {message ? <p className="text-sm text-[var(--success)]">{message}</p> : null}
          {formError ? <p className="text-sm text-[var(--error)]">{formError}</p> : null}

          <Button type="submit" variant="gold" className="w-full" isLoading={isSubmitting}>
            Send reset link
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-2)]">
          Back to{" "}
          <Link href="/login" className="font-medium text-[var(--navy-700)] underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
