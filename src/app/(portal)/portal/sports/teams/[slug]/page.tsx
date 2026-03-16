import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FixturesList } from "@/app/(portal)/portal/sports/_components/fixtures-list";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth/auth";
import { getSportsTeamDetailBySlug } from "@/lib/sports";

type SportsTeamPageProps = {
  params: Promise<{ slug: string }>;
};

function formResultClass(result: "W" | "D" | "L"): string {
  if (result === "W") return "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]";
  if (result === "L") return "bg-[var(--error-bg)] text-[var(--error)] border-[var(--error)]";
  return "bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border)]";
}

export default async function SportsTeamPage({ params }: SportsTeamPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const data = await getSportsTeamDetailBySlug(slug);
  if (!data) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <header className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-sm font-bold text-[var(--white)]"
            style={{ backgroundColor: data.team.badgeColor ?? "#1a3060" }}
          >
            {data.team.abbreviation.slice(0, 3).toUpperCase()}
          </span>
          <div>
            <h1 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">{data.team.name}</h1>
            <p className="text-sm text-[var(--text-2)]">
              {data.team.season.name} ({data.team.season.year})
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-2)]">
          <span>
            Captain:{" "}
            {data.team.captain ? (
              <Link className="font-semibold text-[var(--navy-700)]" href={`/directory/${data.team.captain.id}`}>
                {data.team.captain.name}
              </Link>
            ) : (
              "Not assigned"
            )}
          </span>
          <span>GF: {data.goalsFor}</span>
          <span>GA: {data.goalsAgainst}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-[var(--text-2)]">Form (last 5):</span>
          {data.lastFiveForm.length === 0 ? (
            <span className="text-sm text-[var(--text-3)]">No completed games yet.</span>
          ) : (
            data.lastFiveForm.map((item, index) => (
              <Badge key={`${item}-${index}`} variant="outline" className={formResultClass(item)}>
                {item}
              </Badge>
            ))
          )}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
          <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Full Squad</h2>
          {data.squad.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-3)]">No squad entries yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.squad.map((player) => (
                <li
                  key={player.playerId}
                  className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                >
                  <div>
                    <Link
                      href={`/directory/${player.playerId}`}
                      className="text-sm font-semibold text-[var(--text-1)] hover:text-[var(--navy-700)]"
                    >
                      {player.name}
                    </Link>
                    <p className="text-xs text-[var(--text-3)]">Apps: {player.appearances}</p>
                  </div>
                  <p className="text-xs font-medium text-[var(--text-2)]">
                    G: {player.goals} · A: {player.assists}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <FixturesList fixtures={data.fixtures} title="Fixtures & Results" />
      </div>
    </section>
  );
}
