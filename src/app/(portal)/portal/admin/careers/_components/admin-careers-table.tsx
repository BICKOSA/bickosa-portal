"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import type { AdminJobPostingRow } from "@/lib/careers";
import { formatJobTypeLabel } from "@/lib/careers";

type AdminCareersTableProps = {
  jobs: AdminJobPostingRow[];
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function locationLabel(job: AdminJobPostingRow): string {
  if (job.isRemote) {
    return "Remote";
  }
  if (job.locationCity && job.locationCountry) {
    return `${job.locationCity}, ${job.locationCountry}`;
  }
  return job.locationCity ?? job.locationCountry ?? "Not specified";
}

export function AdminCareersTable({ jobs }: AdminCareersTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function moderate(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/careers/jobs/${id}/approve`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        throw new Error("Could not update posting.");
      }
      toast({
        title: decision === "approve" ? "Posting approved" : "Posting rejected",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--text-2)]">No pending career postings for review.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Poster</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium text-[var(--text-1)]">{job.title}</TableCell>
              <TableCell>{job.company}</TableCell>
              <TableCell>
                <Badge variant="outline">{formatJobTypeLabel(job.type)}</Badge>
              </TableCell>
              <TableCell>{locationLabel(job)}</TableCell>
              <TableCell>
                <div>
                  <p className="text-sm text-[var(--text-1)]">{job.posterName}</p>
                  <p className="text-xs text-[var(--text-3)]">{job.posterEmail}</p>
                </div>
              </TableCell>
              <TableCell>{DATE_FORMATTER.format(job.createdAt)}</TableCell>
              <TableCell>{job.expiresAt ? DATE_FORMATTER.format(job.expiresAt) : "No expiry"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={busyId === job.id}
                    onClick={() => moderate(job.id, "reject")}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="navy"
                    isLoading={busyId === job.id}
                    onClick={() => moderate(job.id, "approve")}
                  >
                    Approve
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
