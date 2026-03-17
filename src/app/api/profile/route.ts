import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import type { ProfileViewData } from "@/app/(portal)/profile/_components/types";
import { trackPortalEvent } from "@/lib/analytics/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles, chapters } from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

const profilePatchSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    yearOfEntry: z.coerce.number().int().min(1900).optional(),
    yearOfCompletion: z.coerce.number().int().min(1900).optional(),
    currentJobTitle: z.string().trim().min(1).optional(),
    currentEmployer: z.string().trim().min(1).optional(),
    industry: z.string().trim().min(1).optional(),
    locationCity: z.string().trim().min(1).optional(),
    locationCountry: z.string().trim().min(1).optional(),
    phone: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .regex(
            /^\+?[0-9()\-\s]{7,20}$/,
            "Enter a valid phone number.",
          ),
      ])
      .optional(),
    bio: z.string().trim().max(280).optional(),
    linkedinUrl: z.union([z.literal(""), z.url()]).optional(),
    websiteUrl: z.union([z.literal(""), z.url()]).optional(),
  })
  .refine(
    (value) =>
      value.yearOfEntry === undefined ||
      value.yearOfCompletion === undefined ||
      value.yearOfCompletion >= value.yearOfEntry + 3,
    {
      path: ["yearOfCompletion"],
      message: "Year of completion must be at least entry year + 3.",
    },
  );

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "BICKOSA", lastName: "Member" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Member" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function countFilledProfileFields(profile: {
  firstName: string | null;
  lastName: string | null;
  yearOfEntry: number | null;
  yearOfCompletion: number | null;
  currentJobTitle: string | null;
  currentEmployer: string | null;
  industry: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  phone: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
}): number {
  const values = [
    profile.firstName,
    profile.lastName,
    profile.yearOfEntry,
    profile.yearOfCompletion,
    profile.currentJobTitle,
    profile.currentEmployer,
    profile.industry,
    profile.locationCity,
    profile.locationCountry,
    profile.phone,
    profile.bio,
    profile.linkedinUrl,
    profile.websiteUrl,
  ];

  return values.filter((value) => value !== null && value !== "").length;
}

async function getProfileView(userId: string): Promise<ProfileViewData | null> {
  const [row] = await db
    .select({
      userId: alumniProfiles.userId,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      yearOfEntry: alumniProfiles.yearOfEntry,
      yearOfCompletion: alumniProfiles.yearOfCompletion,
      currentJobTitle: alumniProfiles.currentJobTitle,
      currentEmployer: alumniProfiles.currentEmployer,
      industry: alumniProfiles.industry,
      locationCity: alumniProfiles.locationCity,
      locationCountry: alumniProfiles.locationCountry,
      phone: alumniProfiles.phone,
      bio: alumniProfiles.bio,
      linkedinUrl: alumniProfiles.linkedinUrl,
      websiteUrl: alumniProfiles.websiteUrl,
      avatarKey: alumniProfiles.avatarKey,
      verificationStatus: alumniProfiles.verificationStatus,
      chapterName: chapters.name,
      membershipTier: alumniProfiles.membershipTier,
      membershipExpiresAt: alumniProfiles.membershipExpiresAt,
    })
    .from(alumniProfiles)
    .leftJoin(chapters, eq(alumniProfiles.chapterId, chapters.id))
    .where(eq(alumniProfiles.userId, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    yearOfEntry: row.yearOfEntry,
    yearOfCompletion: row.yearOfCompletion,
    currentJobTitle: row.currentJobTitle,
    currentEmployer: row.currentEmployer,
    industry: row.industry,
    locationCity: row.locationCity,
    locationCountry: row.locationCountry,
    phone: row.phone,
    bio: row.bio,
    linkedinUrl: row.linkedinUrl,
    websiteUrl: row.websiteUrl,
    avatarKey: row.avatarKey,
    avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
    verificationStatus: row.verificationStatus,
    chapterName: row.chapterName,
    membershipTier: row.membershipTier,
    membershipExpiresAt: row.membershipExpiresAt?.toISOString() ?? null,
  };
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const payload = profilePatchSchema.parse(await request.json());
    const now = new Date();

    const existingProfile = await db.query.alumniProfiles.findFirst({
      where: eq(alumniProfiles.userId, session.user.id),
    });

    if (!existingProfile) {
      const nameParts = splitName(session.user.name ?? "BICKOSA Member");
      await db.insert(alumniProfiles).values({
        userId: session.user.id,
        firstName: payload.firstName ?? nameParts.firstName,
        lastName: payload.lastName ?? nameParts.lastName,
        yearOfEntry: payload.yearOfEntry ?? null,
        yearOfCompletion: payload.yearOfCompletion ?? null,
        currentJobTitle: payload.currentJobTitle ?? null,
        currentEmployer: payload.currentEmployer ?? null,
        industry: payload.industry ?? null,
        locationCity: payload.locationCity ?? null,
        locationCountry: payload.locationCountry ?? null,
        phone: payload.phone || null,
        bio: payload.bio ?? null,
        linkedinUrl: payload.linkedinUrl || null,
        websiteUrl: payload.websiteUrl || null,
        updatedAt: now,
      });
    } else {
      await db
        .update(alumniProfiles)
        .set({
          firstName: payload.firstName ?? existingProfile.firstName,
          lastName: payload.lastName ?? existingProfile.lastName,
          yearOfEntry: payload.yearOfEntry ?? existingProfile.yearOfEntry,
          yearOfCompletion: payload.yearOfCompletion ?? existingProfile.yearOfCompletion,
          currentJobTitle: payload.currentJobTitle ?? existingProfile.currentJobTitle,
          currentEmployer: payload.currentEmployer ?? existingProfile.currentEmployer,
          industry: payload.industry ?? existingProfile.industry,
          locationCity: payload.locationCity ?? existingProfile.locationCity,
          locationCountry: payload.locationCountry ?? existingProfile.locationCountry,
          phone:
            payload.phone !== undefined ? payload.phone || null : existingProfile.phone,
          bio: payload.bio ?? existingProfile.bio,
          linkedinUrl:
            payload.linkedinUrl !== undefined
              ? payload.linkedinUrl || null
              : existingProfile.linkedinUrl,
          websiteUrl:
            payload.websiteUrl !== undefined
              ? payload.websiteUrl || null
              : existingProfile.websiteUrl,
          updatedAt: now,
        })
        .where(
          and(
            eq(alumniProfiles.userId, session.user.id),
            eq(alumniProfiles.id, existingProfile.id),
          ),
        );
    }

    const updatedProfile = await getProfileView(session.user.id);
    if (!updatedProfile) {
      return NextResponse.json({ message: "Profile was not found after update." }, { status: 500 });
    }

    const previousCount = existingProfile
      ? countFilledProfileFields(existingProfile)
      : 0;
    const updatedCount = countFilledProfileFields({
      firstName: updatedProfile.firstName,
      lastName: updatedProfile.lastName,
      yearOfEntry: updatedProfile.yearOfEntry,
      yearOfCompletion: updatedProfile.yearOfCompletion,
      currentJobTitle: updatedProfile.currentJobTitle,
      currentEmployer: updatedProfile.currentEmployer,
      industry: updatedProfile.industry,
      locationCity: updatedProfile.locationCity,
      locationCountry: updatedProfile.locationCountry,
      phone: updatedProfile.phone,
      bio: updatedProfile.bio,
      linkedinUrl: updatedProfile.linkedinUrl,
      websiteUrl: updatedProfile.websiteUrl,
    });

    if (previousCount < 8 && updatedCount >= 8) {
      await trackPortalEvent({
        event: "profile_completed",
        userId: session.user.id,
        properties: {
          fields_filled: updatedCount,
        },
      });
    }

    return NextResponse.json({
      profile: updatedProfile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Failed to update profile." }, { status: 500 });
  }
}
