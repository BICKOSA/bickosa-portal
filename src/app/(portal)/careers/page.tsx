import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BusinessDirectory } from "@/app/(portal)/careers/_components/business-directory";
import { JobCard } from "@/app/(portal)/careers/_components/job-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/auth";
import { listApprovedActiveJobs, listBusinessDirectory } from "@/lib/careers";

type CareersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const TAB_LABELS = {
  jobs: "Job Postings",
  directory: "Business Directory",
  post: "Post a Job",
} as const;

type CareersTab = keyof typeof TAB_LABELS;

function normalizeTab(value: string | null): CareersTab {
  if (value === "directory" || value === "post") {
    return value;
  }
  return "jobs";
}

export default async function CareersPage({ searchParams }: CareersPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const tabValue = typeof resolvedParams.tab === "string" ? resolvedParams.tab : null;
  const industryFilter = typeof resolvedParams.industry === "string" ? resolvedParams.industry : null;
  const activeTab = normalizeTab(tabValue);

  const [jobs, businesses] = await Promise.all([
    listApprovedActiveJobs(),
    listBusinessDirectory({
      industry: industryFilter,
    }),
  ]);

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Career Growth"
        title="Careers"
        description="Discover alumni opportunities, connect with business owners, and share roles with the BICKOSA network."
      />

      <div className="inline-flex w-fit items-center gap-1 rounded-[var(--r-full)] bg-[var(--surface-2)] p-1">
        {(Object.keys(TAB_LABELS) as CareersTab[]).map((tab) => {
          if (tab === "post") {
            return (
              <Link
                key={tab}
                href="/careers/new"
                className="rounded-[var(--r-full)] px-3 py-1.5 text-sm font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text-1)]"
              >
                {TAB_LABELS[tab]}
              </Link>
            );
          }

          const isActive = activeTab === tab;
          const href = tab === "jobs" ? "/careers" : "/careers?tab=directory";
          return (
            <Link
              key={tab}
              href={href}
              className={[
                "rounded-[var(--r-full)] px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--white)] text-[var(--text-1)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-2)] hover:text-[var(--text-1)]",
              ].join(" ")}
            >
              {TAB_LABELS[tab]}
            </Link>
          );
        })}
      </div>

      {activeTab === "jobs" ? (
        jobs.length === 0 ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-[var(--text-2)]">No approved job postings are live right now.</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/careers/new">Post the first role</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <form action="/careers" method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="directory" />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--text-1)]">Filter by industry</span>
              <input
                type="text"
                name="industry"
                defaultValue={industryFilter ?? ""}
                placeholder="e.g. Technology, Finance, Healthcare"
                className="h-10 w-[280px] rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
              />
            </label>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
          <BusinessDirectory items={businesses} />
        </div>
      )}
    </section>
  );
}
