import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function JoinSuccessPage() {
  return (
    <main className="min-h-screen bg-[var(--white)] px-4 py-14">
      <section className="mx-auto max-w-[640px] rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="font-[family-name:var(--font-ui)] text-3xl font-bold text-[var(--navy-900)]">
          Welcome to BICKOSA!
        </h1>

        <p className="mt-3 text-sm text-[var(--text-2)]">
          Your account has been created and your registration is now under
          review. Please check your email to verify your email address.
        </p>

        <div className="mt-5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--navy-50)] p-4">
          <h2 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--navy-900)]">
            Next steps
          </h2>
          <ol className="mt-2 space-y-1.5 text-sm text-[var(--text-2)]">
            <li>
              <span className="font-medium text-[var(--gold-500)]">1.</span>{" "}
              Open your inbox and click the verification link we just sent.
            </li>
            <li>
              <span className="font-medium text-[var(--gold-500)]">2.</span>{" "}
              Log in to the portal — you&apos;ll see your review status.
            </li>
            <li>
              <span className="font-medium text-[var(--gold-500)]">3.</span>{" "}
              Once verified by our team, you&apos;ll have full access.
            </li>
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="navy">
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
