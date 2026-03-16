import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  buildDonationsCsv,
  listAdminDonationsForExport,
  normalizeDonationFilter,
} from "@/lib/admin-donations";

export async function GET(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const url = new URL(request.url);
  const filter = normalizeDonationFilter(url.searchParams);
  const rows = await listAdminDonationsForExport(filter);
  const csv = buildDonationsCsv(rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="donations.csv"',
      "Cache-Control": "no-store",
    },
  });
}
