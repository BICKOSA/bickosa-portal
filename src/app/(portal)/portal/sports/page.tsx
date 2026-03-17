import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";

import { FixturesList } from "@/app/(portal)/portal/sports/_components/fixtures-list";
import { StandingsTable } from "@/app/(portal)/portal/sports/_components/standings-table";
import { TopScorers } from "@/app/(portal)/portal/sports/_components/top-scorers";
import SportsLoading from "@/app/(portal)/portal/sports/loading";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { trackPortalEvent } from "@/lib/analytics/server";
import { auth } from "@/lib/auth/auth";
import { getSportsDashboardData } from "@/lib/sports";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

async function SportsContent({ userId }: { userId: string }) {
  const data = await getSportsDashboardData();
  if (!data) {
    return (
      <EmptyState
        icon={Trophy}
        title="No season has been configured yet"
        body="League standings and fixtures will appear once the new season is published."
      />
    );
  }

  const { season } = data;

  await Promise.all([
    trackPortalEvent({
      event: "standings_viewed",
      userId,
      properties: {
        season_id: season.id,
      },
    }),
    trackPortalEvent({
      event: "fixture_viewed",
      userId,
      properties: {
        season_id: season.id,
      },
    }),
  ]);

  return (
    <>
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="font-[var(--font-ui)] text-lg text-[var(--navy-900)]">Season {season.year}</p>
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
    </>
  );
}

export default async function SportsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <section className="space-y-5">
      <h1 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">
        BICKOSA League
      </h1>
      <Suspense fallback={<SportsLoading />}>
        <SportsContent userId={session.user.id} />
      </Suspense>
    </section>
  );
}
