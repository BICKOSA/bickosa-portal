import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sportsFixtures, sportsSeasons, sportsTeams } from "@/lib/db/schema";

const createFixtureSchema = z.object({
  seasonId: z.string().uuid(),
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  matchweek: z.coerce.number().int().min(1).optional(),
  scheduledAt: z.string().min(1),
  venue: z.string().trim().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "postponed"]).optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const payload = createFixtureSchema.parse(await request.json());
    if (payload.homeTeamId === payload.awayTeamId) {
      return NextResponse.json({ message: "Home and away teams must be different." }, { status: 400 });
    }

    const season = await db.query.sportsSeasons.findFirst({
      where: eq(sportsSeasons.id, payload.seasonId),
      columns: { id: true },
    });
    if (!season) {
      return NextResponse.json({ message: "Season not found." }, { status: 404 });
    }

    const [homeTeam, awayTeam] = await Promise.all([
      db.query.sportsTeams.findFirst({
        where: and(eq(sportsTeams.id, payload.homeTeamId), eq(sportsTeams.seasonId, payload.seasonId)),
        columns: { id: true },
      }),
      db.query.sportsTeams.findFirst({
        where: and(eq(sportsTeams.id, payload.awayTeamId), eq(sportsTeams.seasonId, payload.seasonId)),
        columns: { id: true },
      }),
    ]);
    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ message: "Selected teams must belong to this season." }, { status: 400 });
    }

    const [created] = await db
      .insert(sportsFixtures)
      .values({
        seasonId: payload.seasonId,
        homeTeamId: payload.homeTeamId,
        awayTeamId: payload.awayTeamId,
        matchweek: payload.matchweek ?? null,
        scheduledAt: new Date(payload.scheduledAt),
        venue: payload.venue ?? null,
        status: payload.status ?? "scheduled",
      })
      .returning({
        id: sportsFixtures.id,
      });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create fixture." }, { status: 500 });
  }
}
