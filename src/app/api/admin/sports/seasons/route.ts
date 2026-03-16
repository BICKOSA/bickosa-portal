import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sportsSeasons } from "@/lib/db/schema";

const createSeasonSchema = z.object({
  name: z.string().trim().min(1).max(255),
  year: z.coerce.number().int().min(2000).max(2200),
  sport: z.enum(["football", "basketball", "netball", "volleyball"]),
  isActive: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET() {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const seasons = await db
    .select({
      id: sportsSeasons.id,
      name: sportsSeasons.name,
      year: sportsSeasons.year,
      sport: sportsSeasons.sport,
      isActive: sportsSeasons.isActive,
      startDate: sportsSeasons.startDate,
      endDate: sportsSeasons.endDate,
    })
    .from(sportsSeasons);

  return NextResponse.json({ data: seasons });
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const payload = createSeasonSchema.parse(await request.json());
    if (payload.isActive) {
      await db.update(sportsSeasons).set({ isActive: false });
    }

    const [created] = await db
      .insert(sportsSeasons)
      .values({
        name: payload.name,
        year: payload.year,
        sport: payload.sport,
        isActive: payload.isActive,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
      })
      .returning({
        id: sportsSeasons.id,
      });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create season." }, { status: 500 });
  }
}
