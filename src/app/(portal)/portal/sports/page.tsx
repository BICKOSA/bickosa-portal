import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { FixturesList } from "@/app/(portal)/portal/sports/_components/fixtures-list";
import { StandingsTable } from "@/app/(portal)/portal/sports/_components/standings-table";
import { TopScorers } from "@/app/(portal)/portal/sports/_components/top-scorers";
import { Badge } from "@/components/ui/badge";
import { trackPortalEvent } from "@/lib/analytics/server";
import { auth } from "@/lib/auth/auth";
import { getSportsDashboardData } from "@/lib/sports";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function SportsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const data = await getSportsDashboardData();
  if (!data) {
    return (
      <section className="space-y-4">
        <h1 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">
          BICKOSA League
        </h1>
        <p className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-5 text-sm text-[var(--text-2)]">
          No season has been configured yet.
        </p>
      </section>
    );
  }

  const { season } = data;

  await Promise.all([
    trackPortalEvent({
      event: "standings_viewed",
      userId: session.user.id,
      properties: {
        season_id: season.id,
      },
    }),
    trackPortalEvent({
      event: "fixture_viewed",
      userId: session.user.id,
      properties: {
        season_id: season.id,
      },
    }),
  ]);

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">
            BICKOSA League {season.year}
          </h1>
          {data.hasLiveFixture ? <Badge variant="error">Live</Badge> : null}
        </div>
        <p className="text-sm text-[var(--text-2)]">
          {season.name}
          {season.startDate || season.endDate
            ? ` · ${season.startDate ? DATE_FORMATTER.format(season.startDate) : "TBD"} - ${
                season.endDate ? DATE_FORMATTER.format(season.endDate) : "TBD"
              }`
            : ""}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">
            League Standings
          </h2>
          <StandingsTable standings={data.standings} />
        </div>

        <aside className="space-y-4">
          <TopScorers scorers={data.topScorers} />
          <FixturesList fixtures={data.upcomingFixtures} title="Upcoming Fixtures" />
        </aside>
      </div>
    </section>
  );
}
