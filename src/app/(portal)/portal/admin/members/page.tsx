import Link from "next/link";

import { MembersManagementTable } from "@/app/(portal)/portal/admin/members/_components/members-management-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  listAdminMemberChapterOptions,
  listAdminMembers,
  normalizeAdminMemberFilters,
  type AdminMemberSortField,
} from "@/lib/admin-members";

type AdminMembersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminMembersPage({ searchParams }: AdminMembersPageProps) {
  await requireAdminPageSession();
  const rawSearchParams = await searchParams;
  const filters = normalizeAdminMemberFilters(rawSearchParams);

  const [membersResult, chapterOptions] = await Promise.all([
    listAdminMembers(filters),
    listAdminMemberChapterOptions(),
  ]);

  const baseParams = new URLSearchParams();
  if (filters.status !== "all") baseParams.set("status", filters.status);
  if (filters.chapterId) baseParams.set("chapter", filters.chapterId);
  if (filters.classYear !== null) baseParams.set("classYear", String(filters.classYear));
  if (filters.query) baseParams.set("q", filters.query);
  baseParams.set("pageSize", String(filters.pageSize));

  const buildSortLink = (field: AdminMemberSortField): string => {
    const nextDir = filters.sortBy === field && filters.sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(baseParams);
    params.set("sort", field);
    params.set("dir", nextDir);
    params.set("page", "1");
    return `/admin/members?${params.toString()}`;
  };

  const sortLinks: Record<AdminMemberSortField, string> = {
    name: buildSortLink("name"),
    classYear: buildSortLink("classYear"),
    email: buildSortLink("email"),
    chapter: buildSortLink("chapter"),
    status: buildSortLink("status"),
    joinedAt: buildSortLink("joinedAt"),
  };

  const prevParams = new URLSearchParams(baseParams);
  prevParams.set("sort", filters.sortBy);
  prevParams.set("dir", filters.sortDir);
  prevParams.set("page", String(Math.max(1, filters.page - 1)));

  const nextParams = new URLSearchParams(baseParams);
  nextParams.set("sort", filters.sortBy);
  nextParams.set("dir", filters.sortDir);
  nextParams.set("page", String(filters.page + 1));

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Member Verification"
        description="Review and manage alumni member status, profile completeness, and verification decisions."
      />

      <form
        action="/admin/members"
        method="get"
        className="grid gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 md:grid-cols-5"
      >
        <Input
          label="Search"
          name="q"
          placeholder="Search by name or email"
          defaultValue={filters.query}
          containerClassName="md:col-span-2"
        />

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Status
          <select
            name="status"
            defaultValue={filters.status}
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Chapter
          <select
            name="chapter"
            defaultValue={filters.chapterId ?? ""}
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          >
            <option value="">All chapters</option>
            {chapterOptions.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Class year"
          name="classYear"
          type="number"
          min={1950}
          max={2100}
          placeholder="e.g. 2012"
          defaultValue={filters.classYear ?? ""}
        />

        <div className="flex items-end gap-2 md:col-span-5">
          <Input label="Rows per page" name="pageSize" type="number" min={1} max={100} defaultValue={filters.pageSize} />
          <input type="hidden" name="sort" value={filters.sortBy} />
          <input type="hidden" name="dir" value={filters.sortDir} />
          <input type="hidden" name="page" value="1" />
          <Button type="submit" variant="outline">
            Apply Filters
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link href={`/admin/members?pageSize=${filters.pageSize}`}>Reset</Link>
          </Button>
          <p className="ml-auto text-xs text-[var(--text-3)]">
            Showing {membersResult.rows.length} of {membersResult.total.toLocaleString()} members
          </p>
        </div>
      </form>

      <MembersManagementTable
        rows={membersResult.rows}
        sortBy={filters.sortBy}
        sortDir={filters.sortDir}
        sortLinks={sortLinks}
      />

      <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-3 py-2">
        <p className="text-sm text-[var(--text-2)]">
          Page {membersResult.page} of {membersResult.totalPages}
        </p>
        <div className="flex items-center gap-2">
          {membersResult.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/members?${prevParams.toString()}`}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          {membersResult.page < membersResult.totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/members?${nextParams.toString()}`}>Next</Link>
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
