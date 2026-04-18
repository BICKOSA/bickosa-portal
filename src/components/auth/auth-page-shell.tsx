import type { ReactNode } from "react";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";

type AuthPageShellProps = {
  children: ReactNode;
  variant?: "default" | "immersive";
};

export function AuthPageShell({
  children,
  variant = "default",
}: AuthPageShellProps) {
  if (variant === "immersive") {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--surface)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute top-12 -left-24 h-72 w-72 rounded-full bg-[var(--navy-100)] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[var(--gold-100)] opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,var(--white),rgba(255,255,255,0))]" />

        <Card className="relative grid w-full max-w-5xl overflow-hidden border-[var(--border-2)] bg-[var(--white)] shadow-[0_24px_70px_rgba(13,27,62,0.14)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative hidden min-h-[620px] overflow-hidden bg-[var(--navy-900)] p-10 text-[var(--white)] lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full border border-white/10" />
            <div className="absolute right-10 bottom-20 h-32 w-32 rounded-full bg-white/5 blur-xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%)]" />

            <div className="relative">
              <Image
                src="/logo.png"
                alt="BICKOSA Alumni Portal"
                width={96}
                height={96}
                className="rounded-full bg-white/95 p-2 shadow-[var(--shadow-md)]"
                priority
              />
              <p className="mt-8 text-sm font-medium tracking-[0.28em] text-white/65 uppercase">
                Alumni Portal
              </p>
              <h1 className="mt-4 max-w-sm text-4xl leading-tight font-semibold">
                Welcome back to the BICKOSA community.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/72">
                Sign in to manage your profile, reconnect with classmates, and
                stay close to chapters, events, mentorship, and giving back.
              </p>
            </div>

            <div className="relative grid gap-3 text-sm text-white/78">
              <div className="flex items-center justify-between border-t border-white/12 pt-4">
                <span>Verified alumni network</span>
                <span className="font-semibold text-white">3,847+</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/12 pt-4">
                <span>Worldwide chapters</span>
                <span className="font-semibold text-white">12</span>
              </div>
            </div>
          </div>

          <CardContent className="relative flex min-h-[560px] flex-col justify-center px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
            <div className="mb-7 flex flex-col items-center text-center lg:hidden">
              <Image
                src="/logo.png"
                alt="BICKOSA Alumni Portal"
                width={104}
                height={104}
                className="object-contain"
                priority
              />
              <p className="mt-3 text-sm text-[var(--text-2)]">
                Per Aspera Ad Astra
              </p>
            </div>
            {children}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--white)] px-4 py-10">
      <Card className="w-full max-w-xl border-[var(--border)] shadow-[var(--shadow-sm)]">
        <CardContent className="px-6 py-8 sm:px-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="BICKOSA Alumni Portal"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
            <p className="mt-3 text-sm text-[var(--text-2)]">
              Per Aspera Ad Astra
            </p>
          </div>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
