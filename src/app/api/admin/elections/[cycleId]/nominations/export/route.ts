import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { getNominationsExportRows } from "@/lib/admin-elections";
import {
  buildNominationsCsv,
  buildNominationsPdf,
} from "@/lib/exports/nominations-export";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function GET(request: Request, context: RouteContext) {
  const { error } = await requireAdminApiSession();
  if (error) return error;

  const { cycleId } = await context.params;
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  // "all" exports across every cycle; any other id scopes to that cycle.
  const scopedCycleId = cycleId === "all" ? null : cycleId;
  const rows = await getNominationsExportRows(scopedCycleId);

  const datestamp = new Date().toISOString().slice(0, 10);
  const cycleLabel = scopedCycleId
    ? slugify(rows[0]?.cycleTitle ?? scopedCycleId)
    : "all-cycles";
  const baseName = `nominations-${cycleLabel}-${datestamp}`;
  const titleSuffix = scopedCycleId
    ? rows[0]?.cycleTitle ?? "Election"
    : "All Cycles";

  if (format === "pdf") {
    const buffer = await buildNominationsPdf({
      title: `Nominations · ${titleSuffix}`,
      rows,
    });
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = buildNominationsCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
