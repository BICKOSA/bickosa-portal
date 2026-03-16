import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sportsSeasons, sportsTeams } from "@/lib/db/schema";

const createTeamSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().trim().min(2).max(255),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  abbreviation: z.string().trim().min(2).max(4),
  badgeColor: z.string().trim().optional(),
  captainId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const payload = createTeamSchema.parse(await request.json());

    const season = await db.query.sportsSeasons.findFirst({
      where: eq(sportsSeasons.id, payload.seasonId),
      columns: { id: true },
    });
    if (!season) {
      return NextResponse.json({ message: "Season not found." }, { status: 404 });
    }

    const duplicate = await db.query.sportsTeams.findFirst({
      where: and(eq(sportsTeams.seasonId, payload.seasonId), eq(sportsTeams.slug, payload.slug)),
      columns: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ message: "Team slug already exists for this season." }, { status: 409 });
    }

    const [created] = await db
      .insert(sportsTeams)
      .values({
        seasonId: payload.seasonId,
        name: payload.name,
        slug: payload.slug,
        abbreviation: payload.abbreviation.toUpperCase(),
        badgeColor: payload.badgeColor || "#1a3060",
        captainId: payload.captainId ?? null,
      })
      .returning({
        id: sportsTeams.id,
      });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create team." }, { status: 500 });
  }
}
