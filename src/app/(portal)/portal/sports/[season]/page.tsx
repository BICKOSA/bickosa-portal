import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FixturesList } from "@/app/(portal)/portal/sports/_components/fixtures-list";
import { StandingsTable } from "@/app/(portal)/portal/sports/_components/standings-table";
import { TopScorers } from "@/app/(portal)/portal/sports/_components/top-scorers";
import { Badge } from "@/components/ui/badge";
import { trackPortalEvent } from "@/lib/analytics/server";
import { auth } from "@/lib/auth/auth";
import { getSportsSeasonDetailData } from "@/lib/sports";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type SportsSeasonPageProps = {
  params: Promise<{ season: string }>;
};

export default async function SportsSeasonPage({ params }: SportsSeasonPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { season } = await params;
  const data = await getSportsSeasonDetailData(season);
  if (!data) {
    notFound();
  }

  await Promise.all([
    trackPortalEvent({
      event: "standings_viewed",
      userId: session.user.id,
      properties: {
        season_id: data.season.id,
      },
    }),
    trackPortalEvent({
      event: "fixture_viewed",
      userId: session.user.id,
      properties: {
        season_id: data.season.id,
      },
    }),
  ]);

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">
            {data.season.name} ({data.season.year})
          </h1>
          {data.hasLiveFixture ? <Badge variant="error">Live</Badge> : null}
        </div>
        <p className="text-sm text-[var(--text-2)]">
          {data.season.startDate ? DATE_FORMATTER.format(data.season.startDate) : "TBD"} -{" "}
          {data.season.endDate ? DATE_FORMATTER.format(data.season.endDate) : "TBD"}
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="space-y-3">
            <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Standings</h2>
            <StandingsTable standings={data.standings} />
          </section>

          <section className="space-y-3">
            <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">All Fixtures</h2>
            <div className="space-y-4">
              {data.fixturesByWeek.map((week) => (
                <div key={week.matchweek ?? "unassigned"} className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-2)]">
                    {week.matchweek ? `Matchweek ${week.matchweek}` : "Unassigned week"}
                  </h3>
                  <FixturesList fixtures={week.fixtures} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <TopScorers scorers={data.topScorers} />
          <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-[var(--text-2)]">
              View team pages from the standings table to inspect squads, fixtures, and form.
            </p>
            <Link href="/sports" className="mt-2 inline-block text-sm font-semibold text-[var(--navy-700)]">
              Back to Sports Overview
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
