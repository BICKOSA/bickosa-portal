"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type RegistrationRow = {
  id: string;
  fullName: string;
  email: string;
  graduationYear: number;
  createdAt: Date;
  verificationStatus: "pending" | "verified" | "rejected" | "duplicate";
  schoolRecordMatch: boolean | null;
};

type DuplicateMatch = {
  id: string;
  fullName: string;
  email: string;
  graduationYear: number | null;
  yearOfCompletion: number | null;
};

type Props = {
  rows: RegistrationRow[];
};

export function RegistrationsAdminClient({ rows }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [duplicatesByRow, setDuplicatesByRow] = useState<
    Record<string, DuplicateMatch[]>
  >({});

  const pendingCount = useMemo(
    () => rows.filter((row) => row.verificationStatus === "pending").length,
    [rows],
  );

  async function runAction(
    id: string,
    endpoint: "verify-create-account" | "reject" | "duplicate",
    body: Record<string, unknown>,
    successTitle: string,
  ) {
    setBusyId(id);
    try {
      const response = await fetch(
        `/api/admin/registrations/${id}/${endpoint}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Action failed.");
      }
      toast({
        title: successTitle,
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function loadDuplicates(id: string) {
    try {
      const response = await fetch(
        `/api/admin/registrations/${id}/possible-duplicates`,
      );
      if (!response.ok) {
        throw new Error("Failed to load duplicate suggestions.");
      }
      const payload = (await response.json()) as { rows: DuplicateMatch[] };
      setDuplicatesByRow((current) => ({
        ...current,
        [id]: payload.rows,
      }));
    } catch (error) {
      toast({
        title: "Could not load matches",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-1)]">
          Pending queue:{" "}
          <span className="text-[var(--navy-700)]">{pendingCount}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-3)]">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Year</th>
              <th className="px-3 py-2 font-medium">Submitted</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Match</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const duplicates = duplicatesByRow[row.id] ?? [];
              return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border)] align-top"
                >
                  <td className="px-3 py-2 font-medium text-[var(--text-1)]">
                    {row.fullName}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-2)]">
                    {row.email}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-2)]">
                    {row.graduationYear}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-2)]">
                    {format(new Date(row.createdAt), "PPp")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-[var(--navy-50)] px-2 py-1 text-xs text-[var(--navy-700)]">
                      {row.verificationStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.schoolRecordMatch === true
                          ? "rounded-full bg-[var(--success-bg)] px-2 py-1 text-xs text-[var(--success)]"
                          : row.schoolRecordMatch === false
                            ? "rounded-full bg-[var(--error-bg)] px-2 py-1 text-xs text-[var(--error)]"
                            : "rounded-full bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text-2)]"
                      }
                    >
                      {row.schoolRecordMatch === true
                        ? "Strong match"
                        : row.schoolRecordMatch === false
                          ? "No match"
                          : "Not reviewed"}
                    </span>
                  </td>
                  <td className="space-y-2 px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="navy"
                        isLoading={busyId === row.id}
                        onClick={() =>
                          void runAction(
                            row.id,
                            "verify-create-account",
                            { schoolRecordMatch: true },
                            "Account created and registration verified.",
                          )
                        }
                      >
                        Verify &amp; Create Account
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => {
                          const reason = window.prompt(
                            "Reason for rejection (optional):",
                            "",
                          );
                          void runAction(
                            row.id,
                            "reject",
                            { reason: reason ?? undefined },
                            "Registration rejected.",
                          );
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => {
                          const notes = window.prompt(
                            "Notes for duplicate flag (optional):",
                            "",
                          );
                          void runAction(
                            row.id,
                            "duplicate",
                            { notes: notes ?? undefined },
                            "Marked as duplicate.",
                          );
                        }}
                      >
                        Mark Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === row.id}
                        onClick={() => void loadDuplicates(row.id)}
                      >
                        View possible matches
                      </Button>
                    </div>
                    {duplicates.length > 0 ? (
                      <ul className="rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-2)]">
                        {duplicates.map((match) => (
                          <li key={match.id}>
                            {match.fullName} — {match.email} (
                            {match.graduationYear ??
                              match.yearOfCompletion ??
                              "Unknown year"}
                            )
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
