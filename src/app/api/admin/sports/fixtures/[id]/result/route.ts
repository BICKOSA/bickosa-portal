import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  notifications,
  sportsFixtures,
  sportsTeams,
  users,
} from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchResultSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});

const NOTIFICATION_BATCH_SIZE = 500;

async function insertNotificationBatches(values: Array<{
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
}>) {
  for (let i = 0; i < values.length; i += NOTIFICATION_BATCH_SIZE) {
    const chunk = values.slice(i, i + NOTIFICATION_BATCH_SIZE);
    if (chunk.length > 0) {
      await db.insert(notifications).values(chunk);
    }
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await context.params;
  const fixture = await db.query.sportsFixtures.findFirst({
    where: eq(sportsFixtures.id, id),
    columns: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      seasonId: true,
    },
  });
  if (!fixture) {
    return NextResponse.json({ message: "Fixture not found." }, { status: 404 });
  }

  try {
    const payload = patchResultSchema.parse(await request.json());

    await db
      .update(sportsFixtures)
      .set({
        homeScore: payload.homeScore,
        awayScore: payload.awayScore,
        status: "completed",
      })
      .where(and(eq(sportsFixtures.id, id), eq(sportsFixtures.id, fixture.id)));

    const [homeTeam, awayTeam, verifiedMembers] = await Promise.all([
      db.query.sportsTeams.findFirst({
        where: eq(sportsTeams.id, fixture.homeTeamId),
        columns: { name: true },
      }),
      db.query.sportsTeams.findFirst({
        where: eq(sportsTeams.id, fixture.awayTeamId),
        columns: { name: true },
      }),
      db
        .select({ id: users.id })
        .from(users)
        .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
        .where(
          or(
            eq(users.emailVerified, true),
            eq(alumniProfiles.verificationStatus, "verified"),
          ),
        ),
    ]);

    const homeName = homeTeam?.name ?? "Home Team";
    const awayName = awayTeam?.name ?? "Away Team";
    const title = `Full Time: ${homeName} ${payload.homeScore} - ${payload.awayScore} ${awayName}`;
    const body = `A league result has just been posted.`;
    const actionUrl = `/sports/${fixture.seasonId}`;

    if (verifiedMembers.length > 0) {
      await insertNotificationBatches(
        verifiedMembers.map((user) => ({
          userId: user.id,
          type: "sports.fixture_result",
          title,
          body,
          actionUrl,
        })),
      );
    }

    return NextResponse.json({ id, status: "completed" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to save fixture result." }, { status: 500 });
  }
}
