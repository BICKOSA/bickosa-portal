import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sportsPlayerStats } from "@/lib/db/schema";

const upsertPlayerStatSchema = z.object({
  seasonId: z.string().uuid(),
  playerId: z.string().uuid(),
  teamId: z.string().uuid(),
  goals: z.coerce.number().int().min(0).default(0),
  assists: z.coerce.number().int().min(0).default(0),
  appearances: z.coerce.number().int().min(0).default(0),
  yellowCards: z.coerce.number().int().min(0).default(0),
  redCards: z.coerce.number().int().min(0).default(0),
});

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const payload = upsertPlayerStatSchema.parse(await request.json());
    const [saved] = await db
      .insert(sportsPlayerStats)
      .values({
        seasonId: payload.seasonId,
        playerId: payload.playerId,
        teamId: payload.teamId,
        goals: payload.goals,
        assists: payload.assists,
        appearances: payload.appearances,
        yellowCards: payload.yellowCards,
        redCards: payload.redCards,
      })
      .onConflictDoUpdate({
        target: [sportsPlayerStats.seasonId, sportsPlayerStats.playerId],
        set: {
          teamId: payload.teamId,
          goals: payload.goals,
          assists: payload.assists,
          appearances: payload.appearances,
          yellowCards: payload.yellowCards,
          redCards: payload.redCards,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: sportsPlayerStats.id,
      });

    return NextResponse.json({ id: saved.id }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to save player stats." }, { status: 500 });
  }
}
