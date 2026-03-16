import { NextResponse } from "next/server";

import { listSportsSeasons } from "@/lib/sports";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "active";
  const includeInactive = mode === "all";
  const seasons = await listSportsSeasons({ includeInactive });
  return NextResponse.json({ data: seasons });
}
