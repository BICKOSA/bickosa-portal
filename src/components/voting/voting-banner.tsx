"use client";

import Link from "next/link";
import { Vote, X } from "lucide-react";
import { useEffect, useState } from "react";

type VotingBannerProps = {
  storageKey: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
};

export function VotingBanner({
  storageKey,
  message,
  ctaLabel,
  ctaHref,
}: VotingBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.sessionStorage.getItem(storageKey);
      setVisible(dismissed !== "1");
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      /* no-op */
    }
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Voting announcement"
      className="relative flex flex-wrap items-center justify-center gap-3 bg-[var(--navy-900)] px-4 py-2 text-sm text-[var(--white)]"
    >
      <Vote className="size-4 shrink-0 text-[var(--gold-500)]" aria-hidden="true" />
      <p className="text-center">
        {message}{" "}
        <Link
          href={ctaHref}
          className="font-semibold text-[var(--gold-500)] underline underline-offset-2"
        >
          {ctaLabel}
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss voting banner"
        className="absolute right-2 inline-flex size-7 items-center justify-center rounded-full text-[var(--white)]/70 transition hover:bg-[var(--white)]/10 hover:text-[var(--white)]"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
