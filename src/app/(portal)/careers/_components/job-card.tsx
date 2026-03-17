"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobPostingCardData } from "@/lib/careers";
import { formatJobTypeLabel } from "@/lib/careers";

type JobCardProps = {
  job: JobPostingCardData;
};

function getLocationLabel(job: JobPostingCardData): string {
  if (job.isRemote) {
    return "Remote";
  }

  if (job.locationCity && job.locationCountry) {
    return `${job.locationCity}, ${job.locationCountry}`;
  }

  return job.locationCity ?? job.locationCountry ?? "Location not specified";
}

function getCompanyInitials(company: string): string {
  const words = company
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "CO";
  }

  if (words.length === 1) {
    return words[0]!.slice(0, 2).toUpperCase();
  }

  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
}

function toRelativePostedDate(value: Date): string {
  return formatDistanceToNowStrict(value, { addSuffix: true });
}

export function JobCard({ job }: JobCardProps) {
  const applyHref = job.applyUrl ?? (job.applyEmail ? `mailto:${job.applyEmail}` : null);
  const actionLabel = job.applyUrl ? "Apply Now" : "Contact Poster";

  return (
    <article className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            className="size-10 shrink-0"
            name={getCompanyInitials(job.company)}
            shape="rounded"
          >
            <span className="text-xs font-semibold tracking-wide">{getCompanyInitials(job.company)}</span>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs text-[var(--text-3)]">{job.company}</p>
            <h3 className="truncate font-[var(--font-ui)] text-base font-bold text-[var(--navy-900)]">
              {job.title}
            </h3>
          </div>
        </div>
        <Badge variant="outline">{formatJobTypeLabel(job.type)}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--text-2)]">
        <span>{getLocationLabel(job)}</span>
        {job.salary ? <span>· {job.salary}</span> : null}
        {job.posterClassYear ? <Badge variant="outline">Class of {job.posterClassYear}</Badge> : null}
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-[var(--text-2)]">{job.description}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        {applyHref ? (
          <Button asChild variant="outline" size="sm">
            <Link href={applyHref} target="_blank" rel="noreferrer">
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <span className="text-xs text-[var(--text-3)]">Application contact not provided.</span>
        )}
        <span className="text-xs text-[var(--text-3)]">Posted {toRelativePostedDate(job.postedAt)}</span>
      </div>
    </article>
  );
}
