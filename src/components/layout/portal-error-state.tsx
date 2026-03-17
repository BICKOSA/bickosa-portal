"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type PortalErrorStateProps = {
  error?: Error;
  reset: () => void;
};

export function PortalErrorState({ error, reset }: PortalErrorStateProps) {
  const technicalMessage =
    process.env.NODE_ENV === "development"
      ? error?.message || "An unexpected error occurred."
      : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-6 text-center shadow-[var(--shadow-sm)]">
        <Image
          src="/logo.png"
          alt="BICKOSA"
          width={56}
          height={56}
          className="mx-auto size-14 object-contain"
          priority
        />
        <h1 className="mt-4 font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
          Something went wrong
        </h1>
        {technicalMessage ? (
          <p className="mt-2 rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-2)]">
            {technicalMessage}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
