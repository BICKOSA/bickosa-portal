import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { getPollResultsForAdmin } from "@/lib/admin-polls";

type RouteContext = {
  params: Promise<{ pollId: string }>;
};

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return "choice,count,percentage\n";
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

  const { pollId } = await context.params;
  const data = await getPollResultsForAdmin(pollId);
  if (!data) {
    return NextResponse.json({ message: "Poll not found." }, { status: 404 });
  }

  const csv = data.poll.isAnonymous
    ? toCsv(
        data.aggregate.map((row) => ({
          choice: row.choice,
          count: row.count,
          percentage: row.percentage,
        })),
      )
    : toCsv(
        data.byVoter.map((row) => ({
          voter_id: row.voterId,
          choice: row.choice,
          cast_at: row.castAt.toISOString(),
        })),
      );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="poll-export-${pollId}.csv"`,
    },
  });
}
