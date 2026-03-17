import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  listSchoolRecordBatches,
  listSchoolRecords,
} from "@/lib/alumni-growth";
import { SchoolRecordsAdminClient } from "@/app/(portal)/portal/admin/school-records/_components/school-records-admin-client";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function AdminSchoolRecordsPage({
  searchParams,
}: PageProps) {
  await requireAdminPageSession();
  const raw = await searchParams;
  const query = getString(raw.q).trim();

  const [batches, records] = await Promise.all([
    listSchoolRecordBatches(),
    listSchoolRecords(query),
  ]);

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="School Records Import"
        description="Upload school enrollment records and match pending registrations to official records."
      />

      <form
        action="/admin/school-records"
        method="get"
        className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
          Search imported records
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by full name"
            className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
          />
        </label>
      </form>

      <SchoolRecordsAdminClient batches={batches} records={records} />
    </section>
  );
}
