import Link from "next/link";

import { AdminDonationsTable } from "@/app/(portal)/portal/admin/donations/_components/admin-donations-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  listAdminDonationsPaginated,
  listCampaignOptionsForDonations,
  normalizeDonationFilter,
} from "@/lib/admin-donations";

type AdminDonationsPageProps = {
  searchParams: Promise<{
    campaignId?: string;
    status?: string;
    preset?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AdminDonationsPage({ searchParams }: AdminDonationsPageProps) {
  await requireAdminPageSession();
  const params = await searchParams;
  const normalized = normalizeDonationFilter(params);

  const [donations, campaignOptions] = await Promise.all([
    listAdminDonationsPaginated(normalized),
    listCampaignOptionsForDonations(),
  ]);

  const exportQuery = new URLSearchParams();
  if (normalized.campaignId) exportQuery.set("campaignId", normalized.campaignId);
  if (normalized.status !== "all") exportQuery.set("status", normalized.status);
  if (normalized.preset !== "none") exportQuery.set("preset", normalized.preset);
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);

  const baseParams = new URLSearchParams();
  if (normalized.campaignId) baseParams.set("campaignId", normalized.campaignId);
  if (normalized.status !== "all") baseParams.set("status", normalized.status);
  if (normalized.preset !== "none") baseParams.set("preset", normalized.preset);
  if (params.from) baseParams.set("from", params.from);
  if (params.to) baseParams.set("to", params.to);
  baseParams.set("pageSize", String(normalized.pageSize));

  const prevParams = new URLSearchParams(baseParams);
  prevParams.set("page", String(Math.max(1, normalized.page - 1)));
  const nextParams = new URLSearchParams(baseParams);
  nextParams.set("page", String(normalized.page + 1));

  const presetExportLinks = [
    { key: "this_month", label: "This Month" },
    { key: "last_quarter", label: "Last Quarter" },
    { key: "fiscal_year", label: "Fiscal Year" },
  ].map((item) => {
    const query = new URLSearchParams();
    if (normalized.campaignId) query.set("campaignId", normalized.campaignId);
    if (normalized.status !== "all") query.set("status", normalized.status);
    query.set("preset", item.key);
    return {
      ...item,
      href: `/api/admin/donations/export?${query.toString()}`,
    };
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
            Donations
          </h1>
          <p className="text-sm text-[var(--text-2)]">
            Track all donations, export records, and confirm offline bank transfers.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/api/admin/donations/export?${exportQuery.toString()}`}>Export CSV</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {presetExportLinks.map((preset) => (
          <Button key={preset.key} asChild variant="outline" size="sm">
            <Link href={preset.href}>Export {preset.label}</Link>
          </Button>
        ))}
      </div>

      <form className="grid gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 md:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Campaign
          <select
            name="campaignId"
            defaultValue={normalized.campaignId ?? ""}
            className="w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          >
            <option value="">All campaigns</option>
            {campaignOptions.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Status
          <select
            name="status"
            defaultValue={normalized.status}
            className="w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Preset Range
          <select
            name="preset"
            defaultValue={normalized.preset}
            className="w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          >
            <option value="none">Custom / None</option>
            <option value="this_month">This Month</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="fiscal_year">Fiscal Year</option>
          </select>
        </label>

        <Input label="From" name="from" type="date" defaultValue={params.from ?? ""} />
        <Input label="To" name="to" type="date" defaultValue={params.to ?? ""} />
        <Input
          label="Page size"
          name="pageSize"
          type="number"
          min={1}
          max={100}
          defaultValue={String(normalized.pageSize)}
        />
        <input type="hidden" name="page" value="1" />
        <div className="md:col-span-4 flex items-center gap-2">
          <Button type="submit" variant="outline">
            Apply Filters
          </Button>
          <p className="text-xs text-[var(--text-3)]">
            Showing {donations.items.length} of {donations.total.toLocaleString()} donations
          </p>
        </div>
      </form>

      <AdminDonationsTable rows={donations.items} />

      <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3">
        <p className="text-sm text-[var(--text-2)]">
          Page {donations.page} of {donations.totalPages}
        </p>
        <div className="flex items-center gap-2">
          {donations.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/donations?${prevParams.toString()}`}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          {donations.page < donations.totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/donations?${nextParams.toString()}`}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
