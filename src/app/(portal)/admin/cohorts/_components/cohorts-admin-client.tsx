"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type CohortRow = {
  id: string;
  graduationYear: number;
  name: string | null;
  memberCount: number;
  representativeName: string | null;
};

type AlumniOption = {
  userId: string;
  name: string;
  email: string;
};

export function CohortsAdminClient({ rows }: { rows: CohortRow[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const [searchTermByCohort, setSearchTermByCohort] = useState<
    Record<string, string>
  >({});
  const [optionsByCohort, setOptionsByCohort] = useState<
    Record<string, AlumniOption[]>
  >({});
  const [selectedByCohort, setSelectedByCohort] = useState<
    Record<string, string>
  >({});
  const [busyCohortId, setBusyCohortId] = useState<string | null>(null);

  async function searchAlumni(cohortId: string) {
    const query = searchTermByCohort[cohortId]?.trim() ?? "";
    if (!query) {
      setOptionsByCohort((current) => ({ ...current, [cohortId]: [] }));
      return;
    }
    const response = await fetch(
      `/api/admin/cohorts/alumni-search?query=${encodeURIComponent(query)}`,
    );
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { rows: AlumniOption[] };
    setOptionsByCohort((current) => ({ ...current, [cohortId]: payload.rows }));
  }

  async function assignRepresentative(cohortId: string) {
    const userId = selectedByCohort[cohortId];
    if (!userId) {
      toast({
        title: "Select an alumni member first.",
      });
      return;
    }
    setBusyCohortId(cohortId);
    try {
      const response = await fetch("/api/admin/cohorts/assign-representative", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          cohortId,
          userId,
          role: "Representative",
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Could not assign representative.");
      }
      toast({
        title: "Representative assigned",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setBusyCohortId(null);
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-3)]">
              <th className="px-2 py-2 font-medium">Cohort</th>
              <th className="px-2 py-2 font-medium">Members</th>
              <th className="px-2 py-2 font-medium">Representative</th>
              <th className="px-2 py-2 font-medium">Assign representative</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--border)] align-top"
              >
                <td className="px-2 py-2 font-medium text-[var(--text-1)]">
                  Class of {row.graduationYear}
                </td>
                <td className="px-2 py-2 text-[var(--text-2)]">
                  {Number(row.memberCount)}
                </td>
                <td className="px-2 py-2 text-[var(--text-2)]">
                  {row.representativeName ?? "Not assigned"}
                </td>
                <td className="space-y-2 px-2 py-2">
                  <input
                    value={searchTermByCohort[row.id] ?? ""}
                    onChange={(event) =>
                      setSearchTermByCohort((current) => ({
                        ...current,
                        [row.id]: event.target.value,
                      }))
                    }
                    onBlur={() => void searchAlumni(row.id)}
                    placeholder="Search verified alumni by name or email"
                    className="h-9 w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-2 text-xs"
                  />
                  <select
                    value={selectedByCohort[row.id] ?? ""}
                    onChange={(event) =>
                      setSelectedByCohort((current) => ({
                        ...current,
                        [row.id]: event.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] px-2 text-xs"
                  >
                    <option value="">Select alumni</option>
                    {(optionsByCohort[row.id] ?? []).map((option) => (
                      <option key={option.userId} value={option.userId}>
                        {option.name} ({option.email})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="navy"
                    isLoading={busyCohortId === row.id}
                    onClick={() => void assignRepresentative(row.id)}
                  >
                    Assign Representative
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
