import Link from "next/link";

import { AdminEventsTable } from "@/app/(portal)/portal/admin/events/_components/admin-events-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listAdminEvents, normalizeAdminEventsListQuery } from "@/lib/admin-events";

type AdminEventsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildEventsAdminUrl(params: {
  page?: number;
  search: string;
  published: "all" | "published" | "draft";
  limit: number;
}): string {
  const query = new URLSearchParams();
  if (params.search) {
    query.set("search", params.search);
  }
  if (params.published !== "all") {
    query.set("published", params.published);
  }
  if (params.page && params.page > 1) {
    query.set("page", String(params.page));
  }
  if (params.limit !== 12) {
    query.set("limit", String(params.limit));
  }
  const queryString = query.toString();
  return queryString ? `/admin/events?${queryString}` : "/admin/events";
}

export default async function AdminEventsPage({ searchParams }: AdminEventsPageProps) {
  await requireAdminPageSession();
  const resolvedParams = searchParams ? await searchParams : {};
  const query = normalizeAdminEventsListQuery(resolvedParams);
  const events = await listAdminEvents(query);
  const totalPages = Math.max(1, Math.ceil(events.total / events.limit));
  const previousHref = buildEventsAdminUrl({
    page: Math.max(1, events.page - 1),
    search: events.search,
    published: events.published,
    limit: events.limit,
  });
  const nextHref = buildEventsAdminUrl({
    page: Math.min(totalPages, events.page + 1),
    search: events.search,
    published: events.published,
    limit: events.limit,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PageHeader
          eyebrow="Administration"
          title="Manage Events"
          description="Create, publish, and manage all portal events."
        />
        <Button asChild variant="gold">
          <Link href="/admin/events/new">New Event</Link>
        </Button>
      </div>
      <form action="/admin/events" method="get" className="grid gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 sm:grid-cols-[1fr_180px_auto]">
        <input
          type="text"
          name="search"
          placeholder="Search by title, slug, or location"
          defaultValue={events.search}
          className="w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none"
        />
        <select
          name="published"
          defaultValue={events.published}
          className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)]"
        >
          <option value="all">All statuses</option>
          <option value="published">Published only</option>
          <option value="draft">Draft only</option>
        </select>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-3)]">
          {events.total.toLocaleString()} events
        </p>
        <div className="flex items-center gap-2">
          {events.page <= 1 ? (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href={previousHref}>Previous</Link>
            </Button>
          )}
          <span className="text-xs text-[var(--text-3)]">
            Page {Math.min(events.page, totalPages)} of {totalPages}
          </span>
          {events.page >= totalPages ? (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href={nextHref}>Next</Link>
            </Button>
          )}
        </div>
      </div>
      <AdminEventsTable events={events.data} />
    </section>
  );
}
