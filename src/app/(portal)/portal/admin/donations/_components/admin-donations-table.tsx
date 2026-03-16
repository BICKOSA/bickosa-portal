"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminDonationRow } from "@/lib/admin-donations";

type AdminDonationsTableProps = {
  rows: AdminDonationRow[];
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatAmount(value: bigint, currency: string): string {
  return `${currency} ${Number(value).toLocaleString("en-UG")}`;
}

function formatPaymentMethod(method: string): string {
  return method.replace(/_/g, " ");
}

export function AdminDonationsTable({ rows }: AdminDonationsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function markCompleted(donationId: string) {
    setBusyId(donationId);
    try {
      const response = await fetch(`/api/admin/donations/${donationId}/complete`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? "Could not mark donation as completed.");
      }
      toast({
        title: "Donation marked as completed",
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

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--text-2)]">No donations match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Receipt Sent</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const canCompleteOffline = row.paymentMethod === "bank_transfer" && row.paymentStatus === "pending";
            return (
              <TableRow key={row.id}>
                <TableCell>{DATE_FORMATTER.format(row.date)}</TableCell>
                <TableCell>{row.isAnonymous ? "Anonymous" : row.donorName ?? "Anonymous"}</TableCell>
                <TableCell>{row.campaignTitle}</TableCell>
                <TableCell>{formatAmount(row.amount, row.currency)}</TableCell>
                <TableCell className="capitalize">{formatPaymentMethod(row.paymentMethod)}</TableCell>
                <TableCell>
                  <Badge variant={row.paymentStatus === "completed" ? "success" : "outline"}>
                    {row.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell>{row.receiptSentAt ? DATE_FORMATTER.format(row.receiptSentAt) : "No"}</TableCell>
                <TableCell>
                  {canCompleteOffline ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isLoading={busyId === row.id}
                      onClick={() => markCompleted(row.id)}
                    >
                      Mark as Completed
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--text-3)]">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
