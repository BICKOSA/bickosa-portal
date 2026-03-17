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

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

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
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
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

  return (
    <AuthPageShell>
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--navy-900)]">Sign in</h2>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Access your BICKOSA alumni dashboard.
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
                onCheckedChange={(checked) => setValue("rememberMe", Boolean(checked))}
              />
              Remember me for 30 days
            </label>

            <Link href="/forgot-password" className="text-sm text-[var(--navy-700)] underline">
              Forgot password?
            </Link>
          </div>

          {formError ? <p className="text-sm text-[var(--error)]">{formError}</p> : null}

          <Button type="submit" variant="gold" className="w-full" isLoading={isSubmitting}>
            Sign In
          </Button>
        </form>

        <Button type="button" variant="outline" className="w-full" disabled>
          Continue with Google (coming soon)
        </Button>

        <p className="text-center text-sm text-[var(--text-2)]">
          No account yet?{" "}
          <Link href="/register" className="font-medium text-[var(--navy-700)] underline">
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
