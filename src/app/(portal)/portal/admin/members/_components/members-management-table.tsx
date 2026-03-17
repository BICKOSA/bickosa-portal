"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { AdminMemberRow, AdminMemberSortField, AdminSortDirection } from "@/lib/admin-members";

type MembersManagementTableProps = {
  rows: AdminMemberRow[];
  sortBy: AdminMemberSortField;
  sortDir: AdminSortDirection;
  sortLinks: Record<AdminMemberSortField, string>;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function StatusBadge({ status }: { status: AdminMemberRow["status"] }) {
  if (status === "verified") {
    return <Badge variant="success">Verified</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="error">Rejected</Badge>;
  }
  return <Badge variant="warning">Pending</Badge>;
}

function SortLabel({
  active,
  direction,
  children,
}: {
  active: boolean;
  direction: AdminSortDirection;
  children: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="size-3.5 text-[var(--text-3)]" />
        ) : (
          <ArrowDown className="size-3.5 text-[var(--text-3)]" />
        )
      ) : null}
    </span>
  );
}

export function MembersManagementTable({
  rows,
  sortBy,
  sortDir,
  sortLinks,
}: MembersManagementTableProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  const allVisibleSelected = useMemo(
    () => rows.length > 0 && rows.every((row) => selectedIds.includes(row.profileId)),
    [rows, selectedIds],
  );

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(rows.map((row) => row.profileId));
      return;
    }
    setSelectedIds([]);
  }

  function toggleRowSelection(profileId: string, checked: boolean) {
    setSelectedIds((previous) =>
      checked ? Array.from(new Set([...previous, profileId])) : previous.filter((id) => id !== profileId),
    );
  }

  async function applyAction(profileId: string, action: "approve" | "reject", notes?: string) {
    setBusyRowId(profileId);
    try {
      const response = await fetch(`/api/admin/members/${profileId}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          notes,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Could not process member action.");
      }

      toast({
        title: action === "approve" ? "Member approved" : "Member rejected",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusyRowId(null);
    }
  }

  async function runBulkAction(action: "approve" | "reject", notes?: string) {
    if (selectedIds.length === 0) {
      return;
    }

    setIsBulkBusy(true);
    try {
      const response = await fetch("/api/admin/members/verify-bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileIds: selectedIds,
          action,
          notes,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Bulk ${action} failed.`);
      }

      toast({
        title:
          action === "approve"
            ? `${selectedIds.length} members approved`
            : `${selectedIds.length} members rejected`,
        variant: "success",
      });
      setSelectedIds([]);
      setRejectNotes("");
      setOpenRejectDialog(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Bulk action failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setIsBulkBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--text-2)]">No members found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-3 py-2">
        <p className="text-sm text-[var(--text-2)]">
          {selectedIds.length} selected
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={selectedIds.length === 0}
          isLoading={isBulkBusy}
          onClick={() => runBulkAction("approve")}
        >
          Bulk Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={selectedIds.length === 0 || isBulkBusy}
          onClick={() => setOpenRejectDialog(true)}
        >
          Bulk Reject
        </Button>
      </div>

      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(value) => toggleSelectAll(Boolean(value))}
                  aria-label="Select all members on this page"
                />
              </TableHead>
              <TableHead>Avatar</TableHead>
              <TableHead>
                <Link href={sortLinks.name}>
                  <SortLabel active={sortBy === "name"} direction={sortDir}>
                    Name
                  </SortLabel>
                </Link>
              </TableHead>
              <TableHead>
                <Link href={sortLinks.classYear}>
                  <SortLabel active={sortBy === "classYear"} direction={sortDir}>
                    Class
                  </SortLabel>
                </Link>
              </TableHead>
              <TableHead>
                <Link href={sortLinks.email}>
                  <SortLabel active={sortBy === "email"} direction={sortDir}>
                    Email
                  </SortLabel>
                </Link>
              </TableHead>
              <TableHead>
                <Link href={sortLinks.chapter}>
                  <SortLabel active={sortBy === "chapter"} direction={sortDir}>
                    Chapter
                  </SortLabel>
                </Link>
              </TableHead>
              <TableHead>
                <Link href={sortLinks.status}>
                  <SortLabel active={sortBy === "status"} direction={sortDir}>
                    Status
                  </SortLabel>
                </Link>
              </TableHead>
              <TableHead>
                <Link href={sortLinks.joinedAt}>
                  <SortLabel active={sortBy === "joinedAt"} direction={sortDir}>
                    Joined
                  </SortLabel>
                </Link>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.profileId}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(row.profileId)}
                    onCheckedChange={(value) => toggleRowSelection(row.profileId, Boolean(value))}
                    aria-label={`Select ${row.fullName}`}
                  />
                </TableCell>
                <TableCell>
                  <Avatar size="sm" src={row.avatarUrl} name={row.fullName} />
                </TableCell>
                <TableCell className="font-medium text-[var(--text-1)]">{row.fullName}</TableCell>
                <TableCell>{row.classYear ? `Class ${row.classYear}` : "—"}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.chapterName ?? "Unassigned"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>{DATE_FORMATTER.format(row.joinedAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/members/${row.profileId}`}>View</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isLoading={busyRowId === row.profileId}
                      onClick={() => applyAction(row.profileId, "approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[var(--error)] hover:text-[var(--error)]"
                      isLoading={busyRowId === row.profileId}
                      onClick={() => {
                        const reason = window.prompt("Provide rejection reason:");
                        if (!reason || !reason.trim()) {
                          return;
                        }
                        void applyAction(row.profileId, "reject", reason.trim());
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openRejectDialog} onOpenChange={setOpenRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Members</DialogTitle>
            <DialogDescription>
              A rejection reason is required and will be sent to each selected member.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            label="Rejection reason"
            rows={5}
            value={rejectNotes}
            onChange={(event) => setRejectNotes(event.target.value)}
            placeholder="Explain what information is missing or what they should update."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="navy"
              isLoading={isBulkBusy}
              disabled={!rejectNotes.trim()}
              onClick={() => void runBulkAction("reject", rejectNotes)}
            >
              Reject Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
