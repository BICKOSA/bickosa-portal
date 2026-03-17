import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { getCohortPageData } from "@/lib/alumni-growth";
import { ShareCohortButton } from "@/app/(portal)/cohorts/_components/share-cohort-button";

type PageProps = {
  params: Promise<{ year: string }>;
};

export default async function CohortYearPage({ params }: PageProps) {
  const { year: yearParam } = await params;
  const year = Number.parseInt(yearParam, 10);
  if (!Number.isFinite(year)) {
    notFound();
  }

  const data = await getCohortPageData(year);
  if (!data) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const pageUrl = `${appUrl}/cohorts/${year}`;

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Cohorts"
        title={`Class of ${year}`}
        description={`${data.members.length} verified members in this cohort.`}
      />

      <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)]">
        <div
          className="h-32 w-full bg-[var(--navy-50)]"
          style={
            data.cohort.bannerImageUrl
              ? {
                  backgroundImage: `url(${data.cohort.bannerImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        />
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-2)]">
              Representative: {data.representative?.name ?? "Not assigned"}
              {data.representative?.showEmail
                ? ` · ${data.representative.email}`
                : ""}
              {data.representative?.showPhone
                ? ` · ${data.representative.phone ?? ""}`
                : ""}
            </p>
            <ShareCohortButton href={pageUrl} />
          </div>
        </div>
      </div>

      <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4">
        <h3 className="text-xl font-[var(--font-ui)] font-semibold text-[var(--navy-900)]">
          Members
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.members.map((member) => (
            <article
              key={member.userId}
              className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <p className="font-medium text-[var(--text-1)]">{member.name}</p>
              <p className="text-xs text-[var(--text-3)]">
                {member.currentJobTitle ?? "Alumni member"}
                {member.locationCity ? ` · ${member.locationCity}` : ""}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4">
          <h3 className="text-lg font-[var(--font-ui)] font-semibold text-[var(--navy-900)]">
            Cohort events
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-2)]">
            {data.recentEvents.map((event) => (
              <li key={event.id}>
                {event.title} · {new Date(event.startAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4">
          <h3 className="text-lg font-[var(--font-ui)] font-semibold text-[var(--navy-900)]">
            Cohort giving activity
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-2)]">
            {data.recentDonations.map((donation) => (
              <li key={donation.id}>
                Contribution made ·{" "}
                {new Date(donation.createdAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
