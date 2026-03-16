import Link from "next/link";

import { AdminCampaignsTable } from "@/app/(portal)/portal/admin/campaigns/_components/admin-campaigns-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  listAdminCampaigns,
  normalizeAdminCampaignListQuery,
} from "@/lib/admin-campaigns";

type CampaignsPageProps = {
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string }>;
};

export default async function AdminCampaignsPage({ searchParams }: CampaignsPageProps) {
  await requireAdminPageSession();
  const params = await searchParams;
  const query = normalizeAdminCampaignListQuery(params);
  const campaigns = await listAdminCampaigns(query);

  const prevParams = new URLSearchParams();
  if (query.search) prevParams.set("search", query.search);
  prevParams.set("pageSize", String(query.pageSize));
  prevParams.set("page", String(Math.max(1, query.page - 1)));

  const nextParams = new URLSearchParams();
  if (query.search) nextParams.set("search", query.search);
  nextParams.set("pageSize", String(query.pageSize));
  nextParams.set("page", String(query.page + 1));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
            Campaign Management
          </h1>
          <p className="text-sm text-[var(--text-2)]">
            Manage fundraising campaigns, visibility, and progress settings.
          </p>
        </div>
        <Button asChild variant="navy">
          <Link href="/admin/campaigns/new">New Campaign</Link>
        </Button>
      </div>

      <form className="grid gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 sm:grid-cols-[1fr_120px_auto]">
        <Input name="search" defaultValue={query.search} placeholder="Search campaigns..." />
        <Input
          name="pageSize"
          type="number"
          min={1}
          max={100}
          defaultValue={String(query.pageSize)}
          placeholder="Page size"
        />
        <input type="hidden" name="page" value="1" />
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      <AdminCampaignsTable campaigns={campaigns.items} />

      <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3">
        <p className="text-sm text-[var(--text-2)]">
          Showing {campaigns.items.length} of {campaigns.total.toLocaleString()} campaigns · Page{" "}
          {campaigns.page} of {campaigns.totalPages}
        </p>
        <div className="flex items-center gap-2">
          {campaigns.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/campaigns?${prevParams.toString()}`}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          {campaigns.page < campaigns.totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/campaigns?${nextParams.toString()}`}>Next</Link>
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
