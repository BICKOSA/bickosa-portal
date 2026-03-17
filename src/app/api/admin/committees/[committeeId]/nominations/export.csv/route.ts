import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { listCommitteeNominationsForAdmin } from "@/lib/committees";

type RouteContext = {
  params: Promise<{ committeeId: string }>;
};

function escapeCsvValue(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

function toCsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { committeeId } = await context.params;
  const rows = await listCommitteeNominationsForAdmin({
    committeeId,
    status: null,
  });

  const csvRows = rows.map((row) => ({
    nomination_id: row.nominationId,
    nominee_name: row.nomineeName,
    nominee_year: row.nomineeYear ? String(row.nomineeYear) : "",
    nominated_by: row.nominatedByName,
    submitted_at: row.createdAt.toISOString(),
    status: row.status,
    reason: row.reason ?? "",
    response_note: row.responseNote ?? "",
    responded_at: row.respondedAt ? row.respondedAt.toISOString() : "",
  }));

  const body = toCsv(csvRows);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="committee-${committeeId}-nominations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
