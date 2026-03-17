import { eq } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles, mentorshipPreferences, privacySettings } from "@/lib/db/schema";
import { MENTORSHIP_FOCUS_AREAS } from "@/lib/mentorship";

const mentorshipPreferencesSchema = z
  .object({
    isAvailable: z.boolean(),
    focusAreas: z.array(z.enum(MENTORSHIP_FOCUS_AREAS)).min(1, "Select at least one focus area."),
    maxMentees: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    contactMethod: z.union([z.literal("email"), z.literal("scheduling_link")]),
    schedulingUrl: z.union([z.literal(""), z.url("Enter a valid scheduling URL.")]).optional(),
    mentorshipBio: z
      .string()
      .trim()
      .min(10, "Mentorship bio should be at least 10 characters.")
      .max(280, "Mentorship bio must be 280 characters or less."),
  })
  .refine(
    (value) => value.contactMethod === "email" || Boolean(value.schedulingUrl?.trim()),
    {
      path: ["schedulingUrl"],
      message: "Add a scheduling URL when using scheduling link as your contact method.",
    },
  );

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const payload = mentorshipPreferencesSchema.parse(await request.json());
    const now = new Date();

    await db
      .insert(mentorshipPreferences)
      .values({
        userId: session.user.id,
        isAvailable: payload.isAvailable,
        focusAreas: payload.focusAreas,
        maxMentees: payload.maxMentees,
        contactMethod: payload.contactMethod,
        schedulingUrl: payload.schedulingUrl?.trim() || null,
        mentorshipBio: payload.mentorshipBio,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [mentorshipPreferences.userId],
        set: {
          isAvailable: payload.isAvailable,
          focusAreas: payload.focusAreas,
          maxMentees: payload.maxMentees,
          contactMethod: payload.contactMethod,
          schedulingUrl: payload.schedulingUrl?.trim() || null,
          mentorshipBio: payload.mentorshipBio,
          updatedAt: now,
        },
      });

    await db
      .insert(privacySettings)
      .values({
        userId: session.user.id,
        availableForMentorship: payload.isAvailable,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [privacySettings.userId],
        set: {
          availableForMentorship: payload.isAvailable,
          updatedAt: now,
        },
      });

    const existingProfile = await db.query.alumniProfiles.findFirst({
      where: eq(alumniProfiles.userId, session.user.id),
      columns: { id: true },
    });

    if (!existingProfile) {
      const nameParts = (session.user.name ?? "BICKOSA Member").trim().split(/\s+/);
      const firstName = nameParts[0] || "BICKOSA";
      const lastName = nameParts.slice(1).join(" ") || "Member";
      await db.insert(alumniProfiles).values({
        userId: session.user.id,
        firstName,
        lastName,
        isAvailableForMentorship: payload.isAvailable,
        updatedAt: now,
      });
    } else {
      await db
        .update(alumniProfiles)
        .set({
          isAvailableForMentorship: payload.isAvailable,
          updatedAt: now,
        })
        .where(eq(alumniProfiles.userId, session.user.id));
    }

    return NextResponse.json({
      preferences: {
        isAvailable: payload.isAvailable,
        focusAreas: payload.focusAreas,
        maxMentees: payload.maxMentees,
        contactMethod: payload.contactMethod,
        schedulingUrl: payload.schedulingUrl?.trim() || null,
        mentorshipBio: payload.mentorshipBio,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Failed to update mentorship preferences." },
      { status: 500 },
    );
  }
}
