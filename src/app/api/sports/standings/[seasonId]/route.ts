import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { sportsSeasons } from "@/lib/db/schema";
import { getStandingsBySeasonId } from "@/lib/sports";

type RouteContext = {
  params: Promise<{ seasonId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { seasonId } = await context.params;
  const season = await db.query.sportsSeasons.findFirst({
    where: eq(sportsSeasons.id, seasonId),
    columns: { id: true },
  });

  if (!season) {
    return NextResponse.json({ message: "Season not found." }, { status: 404 });
  }

  const standings = await getStandingsBySeasonId(seasonId);
  return NextResponse.json({
    seasonId,
    data: standings,
  });
}
