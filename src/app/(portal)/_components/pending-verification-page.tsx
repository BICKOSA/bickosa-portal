import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export function PendingVerificationPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <Image
            src="/logo.png"
            alt="BICKOSA"
            width={80}
            height={80}
            className="object-contain"
          />
        </div>

        <h1 className="font-[family-name:var(--font-ui)] text-2xl font-bold text-[var(--navy-900)]">
          Your Registration is Under Review
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-2)]">
          Thank you for joining BICKOSA. Our verification team is reviewing your
          details. You will receive an email and a portal notification once your
          membership is confirmed.
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--navy-50)] p-5 text-left">
          <h2 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--navy-900)]">
            What happens next?
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-2)]">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-[var(--gold-500)]">1.</span>
              Our admin team will review your details against school records.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-[var(--gold-500)]">2.</span>
              This typically takes 3–5 working days.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-[var(--gold-500)]">3.</span>
              Once verified, you&apos;ll have full access to the alumni portal.
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="navy" size="sm">
            <Link href="/profile">Update Your Information</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">Privacy Settings</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-[var(--text-3)]">
          Questions? Contact us at{" "}
          <a
            href="mailto:info@bickosa.com"
            className="font-medium text-[var(--navy-700)] underline"
          >
            info@bickosa.com
          </a>
        </p>
      </div>
    </div>
  );
}
