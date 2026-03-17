"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] px-6 py-12 text-center shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {icon ? (
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[var(--navy-50)] text-[var(--navy-700)]">
          {icon}
        </span>
      ) : null}
      <h3 className="mt-4 font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">{title}</h3>
      {body ? <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-3)]">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
