import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { SportsTopScorer } from "@/lib/sports";

type TopScorersProps = {
  scorers: SportsTopScorer[];
};

export function TopScorers({ scorers }: TopScorersProps) {
  return (
    <Card className="overflow-hidden">
      <div className="h-2 w-full bg-[var(--gold-500)]" />
      <CardContent className="space-y-3 pt-4">
        <h3 className="font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">Top Scorers</h3>
        {scorers.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">No scorer stats available.</p>
        ) : (
          <ul className="space-y-2">
            {scorers.map((item) => (
              <li
                key={item.playerId}
                className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={
                      item.rank === 1
                        ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold-500)] text-xs font-semibold text-[var(--navy-900)]"
                        : "inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--navy-100)] text-xs font-semibold text-[var(--navy-900)]"
                    }
                  >
                    {item.rank}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/directory/${item.playerId}`}
                      className="truncate text-sm font-semibold text-[var(--text-1)] hover:text-[var(--navy-700)]"
                    >
                      {item.playerName}
                    </Link>
                    <p className="text-xs text-[var(--text-3)]">{item.teamName}</p>
                  </div>
                </div>
                <span className="font-[var(--font-ui)] text-lg font-bold text-[var(--navy-900)]">{item.goals}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
