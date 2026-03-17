import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  listAdminRegistrations,
  normalizeRegistrationFilters,
} from "@/lib/alumni-growth";
import { RegistrationsAdminClient } from "@/app/(portal)/portal/admin/registrations/_components/registrations-admin-client";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function AdminRegistrationsPage({
  searchParams,
}: PageProps) {
  await requireAdminPageSession();
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const key of Object.keys(raw)) {
    query.set(key, getString(raw[key]));
  }
  const filters = normalizeRegistrationFilters(query);
  const rows = await listAdminRegistrations(filters);

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Public Alumni Registrations"
        description="Review pending self-registration submissions and verify alumni accounts."
      />

      <form
        action="/admin/registrations"
        method="get"
        className="grid gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 md:grid-cols-4"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Status
          <select
            name="status"
            defaultValue={filters.status}
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="duplicate">Duplicate</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Graduation year
          <input
            name="graduationYear"
            type="number"
            defaultValue={filters.graduationYear ?? ""}
            min={1999}
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          From date
          <input
            name="from"
            type="date"
            defaultValue={
              filters.fromDate
                ? filters.fromDate.toISOString().slice(0, 10)
                : ""
            }
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          To date
          <input
            name="to"
            type="date"
            defaultValue={
              filters.toDate ? filters.toDate.toISOString().slice(0, 10) : ""
            }
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          />
        </label>
        <div className="md:col-span-4">
          <button
            type="submit"
            className="h-10 rounded-[var(--r-md)] border border-[var(--navy-900)] bg-[var(--navy-900)] px-4 text-sm font-semibold text-[var(--white)]"
          >
            Apply filters
          </button>
        </div>
      </form>

      <RegistrationsAdminClient rows={rows} />
    </section>
  );
}
