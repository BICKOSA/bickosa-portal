"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setMessage(null);
    setFormError(null);

    if (!token) {
      setFormError("Reset token is missing or invalid.");
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        newPassword: values.newPassword,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setFormError(body?.message ?? "Failed to reset password.");
      return;
    }

    setMessage("Password updated successfully. Redirecting to login...");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  return (
    <AuthPageShell>
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--navy-900)]">Reset password</h2>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Set a new password for your BICKOSA account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            {...register("newPassword")}
            error={errors.newPassword?.message}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />

          {message ? <p className="text-sm text-[var(--success)]">{message}</p> : null}
          {formError ? <p className="text-sm text-[var(--error)]">{formError}</p> : null}

          <Button type="submit" variant="gold" className="w-full" isLoading={isSubmitting}>
            Update password
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-2)]">
          Back to{" "}
          <Link href="/login" className="font-medium text-[var(--navy-700)] underline">
            Login
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
