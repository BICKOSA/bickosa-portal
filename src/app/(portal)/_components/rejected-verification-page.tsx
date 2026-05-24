import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type RejectedVerificationPageProps = {
  reason?: string | null;
};

export function RejectedVerificationPage({
  reason,
}: RejectedVerificationPageProps) {
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
          Verification Update
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-2)]">
          We were unable to verify your membership at this time. This may be due
          to incomplete information or a mismatch with our school records.
        </p>

        {reason ? (
          <div className="mx-auto mt-5 max-w-md rounded-[var(--r-lg)] border border-[var(--error)]/20 bg-[color:rgba(185,28,28,0.04)] p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--error)]">
              Reason
            </p>
            <p className="mt-1 text-sm text-[var(--text-1)]">{reason}</p>
          </div>
        ) : null}

        <div className="mx-auto mt-6 max-w-md rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--navy-50)] p-5 text-left">
          <h2 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--navy-900)]">
            What can you do?
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-2)]">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-[var(--gold-500)]">&bull;</span>
              Update your profile with the corrected information — we&apos;ll
              put you back in the review queue automatically.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-[var(--gold-500)]">&bull;</span>
              Add details that help us verify you (graduation year, stream,
              teachers or classmates you remember).
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-[var(--gold-500)]">&bull;</span>
              Or contact us if something isn&apos;t adding up.
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="gold">
            <Link href="/profile">
              Update my profile <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="mailto:info@bickosa.com">Contact support</a>
          </Button>
        </div>

        <p className="mt-4 text-xs text-[var(--text-3)]">
          Saving your updated profile re-queues you for review — no need to
          email us first.
        </p>
      </div>
    </div>
  );
}
