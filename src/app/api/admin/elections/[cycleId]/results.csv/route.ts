import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { getElectionResultsForAdmin } from "@/lib/admin-elections";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return "position,candidate,vote_count,percentage\n";
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const serialized = String(value).replaceAll('"', '""');
          return `"${serialized}"`;
        })
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApiSession();
  if (error) return error;

  const { cycleId } = await context.params;
  const rows = await getElectionResultsForAdmin(cycleId);
  const csv = toCsv(
    rows.map((row) => ({
      position: row.positionTitle,
      candidate: row.nomineeName,
      vote_count: row.voteCount,
      percentage: row.percentage,
    })),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="election-results-${cycleId}.csv"`,
    },
  });
}
