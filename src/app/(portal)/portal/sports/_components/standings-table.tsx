import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeamStanding } from "@/lib/sports";

type StandingsTableProps = {
  standings: TeamStanding[];
};

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>P</TableHead>
            <TableHead>W</TableHead>
            <TableHead>D</TableHead>
            <TableHead>L</TableHead>
            <TableHead>GF</TableHead>
            <TableHead>GA</TableHead>
            <TableHead>GD</TableHead>
            <TableHead>Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((row) => (
            <TableRow
              key={row.teamId}
              className={
                row.rank === 1
                  ? "bg-[var(--gold-50)] hover:bg-[var(--gold-50)]"
                  : "hover:bg-[var(--surface-2)]"
              }
            >
              <TableCell className={row.rank === 1 ? "font-bold text-[var(--gold-800)]" : "font-semibold"}>
                {row.rank}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-[10px] font-semibold text-[var(--white)]"
                    style={{ backgroundColor: row.badgeColor ?? "#1a3060" }}
                  >
                    {row.abbreviation.slice(0, 3).toUpperCase()}
                  </span>
                  <Link href={`/sports/teams/${row.teamSlug}`} className="font-medium hover:text-[var(--navy-700)]">
                    {row.teamName}
                  </Link>
                  {row.live ? <Badge variant="error">Live</Badge> : null}
                </div>
              </TableCell>
              <TableCell>{row.played}</TableCell>
              <TableCell>{row.won}</TableCell>
              <TableCell>{row.drawn}</TableCell>
              <TableCell>{row.lost}</TableCell>
              <TableCell>{row.goalsFor}</TableCell>
              <TableCell>{row.goalsAgainst}</TableCell>
              <TableCell>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</TableCell>
              <TableCell className="font-semibold">{row.points}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
