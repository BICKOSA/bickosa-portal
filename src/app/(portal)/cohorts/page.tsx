import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listCohortsDirectory } from "@/lib/alumni-growth";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function CohortsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = getString(params.sort) === "oldest" ? "oldest" : "recent";
  const rows = await listCohortsDirectory(sort);

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Community"
        title="Cohort Directory"
        description="Browse year groups, member counts, and active cohort representatives."
      />
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant={sort === "recent" ? "navy" : "outline"}
          size="sm"
        >
          <Link href="/cohorts?sort=recent">Most recent first</Link>
        </Button>
        <Button
          asChild
          variant={sort === "oldest" ? "navy" : "outline"}
          size="sm"
        >
          <Link href="/cohorts?sort=oldest">Oldest first</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Link
            key={row.cohortId}
            href={`/cohorts/${row.graduationYear}`}
            className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]"
          >
            <p className="text-2xl font-[var(--font-ui)] font-bold text-[var(--navy-900)]">
              Class of {row.graduationYear}
            </p>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              {Number(row.memberCount)} verified members
            </p>
            <p className="mt-1 text-sm text-[var(--text-3)]">
              Representative: {row.representativeName ?? "Not assigned"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
