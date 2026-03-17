"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

import { appointToCommittee, sendNominationReminder } from "@/app/actions/committees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type NominationRow = {
  nominationId: string;
  nomineeId: string;
  nomineeName: string;
  nomineeYear: number | null;
  nominatedById: string;
  nominatedByName: string;
  reason: string | null;
  status: "pending" | "confirmed_willing" | "declined" | "appointed";
  confirmationSentAt: Date | null;
  respondedAt: Date | null;
  responseNote: string | null;
  createdAt: Date;
};

function nominationStatusVariant(status: NominationRow["status"]) {
  if (status === "confirmed_willing") return "navy";
  if (status === "declined") return "error";
  if (status === "appointed") return "success";
  return "outline";
}

export function CommitteeNominationsDashboardClient(props: {
  committeeId: string;
  committeeName: string;
  maxMembers: number | null;
  initialRows: NominationRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = React.useState(props.initialRows);
  const [filter, setFilter] = React.useState<NominationRow["status"] | "all">("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/admin/committees/${props.committeeId}/nominations`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { rows: NominationRow[] };
      setRows(payload.rows);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [props.committeeId]);

  const filteredRows = rows.filter((row) => filter === "all" || row.status === filter);
  const stats = {
    total: rows.length,
    pending: rows.filter((row) => row.status === "pending").length,
    confirmed: rows.filter((row) => row.status === "confirmed_willing").length,
    declined: rows.filter((row) => row.status === "declined").length,
    appointed: rows.filter((row) => row.status === "appointed").length,
  };

  async function onRemind(nominationId: string) {
    setBusyId(nominationId);
    const result = await sendNominationReminder(nominationId);
    setBusyId(null);
    if (!result.ok) {
      toast({ title: "Could not send reminder", description: result.message });
      return;
    }
    toast({ title: "Reminder sent", variant: "success" });
    router.refresh();
  }

  async function onAppoint(nominationId: string) {
    setBusyId(nominationId);
    const result = await appointToCommittee(nominationId);
    setBusyId(null);
    if (!result.ok) {
      toast({ title: "Could not appoint nominee", description: result.message });
      return;
    }
    toast({ title: "Nominee appointed", variant: "success" });
    router.refresh();
  }

  const turnoutPercent =
    props.maxMembers && props.maxMembers > 0
      ? Math.min(100, Math.round((stats.total / props.maxMembers) * 100))
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-(--r-md) bg-(--navy-900) px-4 py-3 text-sm text-(--white)">
        <Lock className="size-4" />
        <p>
          Nomination records are write-protected. They cannot be edited or deleted to ensure the integrity and
          transparency of the committee formation process.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-(--r-md) border border-border bg-(--white) p-3">
          <p className="text-xs uppercase tracking-wide text-(--text-3)">Total nominations</p>
          <p className="mt-1 text-2xl font-semibold text-(--navy-900)">{stats.total}</p>
        </div>
        <div className="rounded-(--r-md) border border-border bg-(--white) p-3">
          <p className="text-xs uppercase tracking-wide text-(--text-3)">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-(--navy-900)">{stats.pending}</p>
        </div>
        <div className="rounded-(--r-md) border border-border bg-(--white) p-3">
          <p className="text-xs uppercase tracking-wide text-(--text-3)">Confirmed willing</p>
          <p className="mt-1 text-2xl font-semibold text-(--navy-900)">{stats.confirmed}</p>
        </div>
        <div className="rounded-(--r-md) border border-border bg-(--white) p-3">
          <p className="text-xs uppercase tracking-wide text-(--text-3)">Declined</p>
          <p className="mt-1 text-2xl font-semibold text-(--navy-900)">{stats.declined}</p>
        </div>
        <div className="rounded-(--r-md) border border-border bg-(--white) p-3">
          <p className="text-xs uppercase tracking-wide text-(--text-3)">Appointed</p>
          <p className="mt-1 text-2xl font-semibold text-(--navy-900)">{stats.appointed}</p>
        </div>
      </div>

      <div className="rounded-(--r-md) border border-border bg-(--white) p-3">
        <p className="text-sm font-semibold text-(--text-1)">Turnout gauge</p>
        <p className="text-xs text-(--text-3)">
          {props.maxMembers
            ? `${stats.total} nominations received vs target of ${props.maxMembers} members`
            : `${stats.total} nominations received (no max-members target configured)`}
        </p>
        {turnoutPercent !== null ? (
          <div className="mt-2 h-2 w-full rounded-full bg-(--surface)">
            <div className="h-2 rounded-full bg-(--navy-900)" style={{ width: `${turnoutPercent}%` }} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending", "confirmed_willing", "declined", "appointed"] as const).map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? "navy" : "outline"}
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
        <Button asChild variant="outline" size="sm">
          <a href={`/api/admin/committees/${props.committeeId}/nominations/export.csv`}>Export nominations as CSV</a>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-(--r-md) border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-(--navy-900) text-(--white)">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Nominee</th>
              <th className="px-3 py-2 text-left font-medium">Nominated by</th>
              <th className="px-3 py-2 text-left font-medium">Date submitted</th>
              <th className="px-3 py-2 text-left font-medium">Reason</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.nominationId} className="border-b border-border bg-(--white)">
                <td className="px-3 py-2">
                  <p className="font-medium text-(--text-1)">{row.nomineeName}</p>
                  <p className="text-xs text-(--text-3)">
                    {row.nomineeYear ? `Class of ${row.nomineeYear}` : "Year unavailable"}
                  </p>
                </td>
                <td className="px-3 py-2">{row.nominatedByName}</td>
                <td className="px-3 py-2 text-xs text-(--text-3)">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="max-w-[420px] px-3 py-2 text-(--text-2)">{row.reason ?? "-"}</td>
                <td className="px-3 py-2">
                  <Badge variant={nominationStatusVariant(row.status)}>{row.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {row.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={busyId === row.nominationId}
                        onClick={() => void onRemind(row.nominationId)}
                      >
                        Send Reminder Email
                      </Button>
                    ) : null}
                    {row.status === "confirmed_willing" ? (
                      <Button
                        size="sm"
                        variant="gold"
                        isLoading={busyId === row.nominationId}
                        onClick={() => void onAppoint(row.nominationId)}
                      >
                        Appoint
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
