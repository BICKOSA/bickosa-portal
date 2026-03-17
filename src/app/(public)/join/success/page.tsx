import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function JoinSuccessPage() {
  return (
    <main className="min-h-screen bg-[var(--white)] px-4 py-14">
      <section className="mx-auto max-w-[640px] rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-3xl font-[var(--font-ui)] font-bold text-[var(--navy-900)]">
          Welcome to BICKOSA!
        </h1>
        <p className="mt-3 text-sm text-[var(--text-2)]">
          Your registration has been received. We&apos;ll review your
          information and send you a confirmation email within 5 working days.
          Once verified, you&apos;ll receive a link to create your account and
          access the portal.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="navy">
            <Link href="/login">Go to login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/join">Submit another registration</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
