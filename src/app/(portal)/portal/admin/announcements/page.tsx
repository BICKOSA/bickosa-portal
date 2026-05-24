import Link from "next/link";
import { Megaphone } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listAnnouncementsForAdmin } from "@/lib/announcements";
import { formatDateTime } from "@/lib/datetime";

const audienceLabel: Record<string, string> = {
  all_members: "All members",
  verified_only: "Verified only",
  chapter: "Chapter",
  admins: "Admins",
};

const channelLabel: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  in_app: "In-app",
};

const statusVariant: Record<
  string,
  "outline" | "navy" | "gold" | "success" | "warning" | "error"
> = {
  draft: "outline",
  sending: "navy",
  sent: "success",
  partial: "warning",
  failed: "error",
};

export default async function AdminAnnouncementsPage() {
  await requireAdminPageSession();
  const rows = await listAnnouncementsForAdmin();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          eyebrow="Administration"
          title="Announcements"
          description="Compose and send announcements to alumni across email, in-app, and (soon) SMS."
        />
        <Button asChild variant="gold">
          <Link href="/admin/announcements/new">New announcement</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-6" />}
          title="No announcements yet"
          body="Compose your first announcement to broadcast updates, events, or election reminders."
          action={
            <Button asChild variant="navy">
              <Link href="/admin/announcements/new">Compose announcement</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] text-left text-xs uppercase tracking-wide text-[var(--text-3)]">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Audience</th>
                <th className="px-4 py-2">Channels</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Delivery</th>
                <th className="px-4 py-2">Sent</th>
                <th className="px-4 py-2 text-right">By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 font-medium text-[var(--navy-900)]">
                    {row.title}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-2)]">
                    {audienceLabel[row.audience] ?? row.audience}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-2)]">
                    {row.channels
                      .map((c) => channelLabel[c] ?? c)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={statusVariant[row.status] ?? "outline"}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--text-3)]">
                    {row.status === "draft"
                      ? "—"
                      : `${row.successCount}/${row.recipientCount} sent${
                          row.failureCount > 0 ? ` · ${row.failureCount} failed` : ""
                        }`}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--text-3)]">
                    {row.sentAt ? formatDateTime(row.sentAt) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-[var(--text-3)]">
                    {row.authorName ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
