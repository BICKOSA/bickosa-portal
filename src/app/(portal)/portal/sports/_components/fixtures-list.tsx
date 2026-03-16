import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SportsFixtureItem } from "@/lib/sports";

type FixturesListProps = {
  fixtures: SportsFixtureItem[];
  title?: string;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function statusToLabel(status: SportsFixtureItem["status"]): string {
  if (status === "scheduled") return "Scheduled";
  if (status === "in_progress") return "Live";
  if (status === "completed") return "FT";
  return "Postponed";
}

function statusToVariant(status: SportsFixtureItem["status"]): "outline" | "error" | "success" | "warning" {
  if (status === "in_progress") return "error";
  if (status === "completed") return "success";
  if (status === "postponed") return "warning";
  return "outline";
}

function TeamBadge({ color, abbreviation }: { color: string | null; abbreviation: string }) {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-[11px] font-semibold text-[var(--white)]"
      style={{ backgroundColor: color ?? "#1a3060" }}
    >
      {abbreviation.slice(0, 3).toUpperCase()}
    </span>
  );
}

export function FixturesList({ fixtures, title = "Upcoming Fixtures" }: FixturesListProps) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">{title}</h3>
        {fixtures.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">No fixtures available.</p>
        ) : (
          <ul className="space-y-3">
            {fixtures.map((fixture) => (
              <li
                key={fixture.id}
                className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--text-3)]">
                    {DATE_TIME_FORMATTER.format(fixture.scheduledAt)}
                    {fixture.venue ? ` · ${fixture.venue}` : ""}
                  </p>
                  <Badge variant={statusToVariant(fixture.status)}>{statusToLabel(fixture.status)}</Badge>
                </div>

                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Link
                    href={`/sports/teams/${fixture.homeTeam.slug}`}
                    className="flex items-center gap-2 truncate text-sm font-semibold text-[var(--text-1)]"
                  >
                    <TeamBadge color={fixture.homeTeam.badgeColor} abbreviation={fixture.homeTeam.abbreviation} />
                    <span className="truncate">{fixture.homeTeam.name}</span>
                  </Link>

                  <p className="text-center font-[var(--font-ui)] text-xl font-bold text-[var(--navy-900)]">
                    {fixture.status === "completed" || fixture.status === "in_progress"
                      ? `${fixture.homeScore ?? 0} - ${fixture.awayScore ?? 0}`
                      : "vs"}
                  </p>

                  <Link
                    href={`/sports/teams/${fixture.awayTeam.slug}`}
                    className="flex items-center justify-end gap-2 truncate text-right text-sm font-semibold text-[var(--text-1)]"
                  >
                    <span className="truncate">{fixture.awayTeam.name}</span>
                    <TeamBadge color={fixture.awayTeam.badgeColor} abbreviation={fixture.awayTeam.abbreviation} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
