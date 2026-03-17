import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  consentLogs,
  privacySettings,
  users,
} from "@/lib/db/schema";
import { trackPortalEvent } from "@/lib/analytics/server";

const joinWithAccountSchema = z
  .object({
    email: z.email(),
    firstName: z.string().min(1),
    lastName: z.string(),
    graduationYear: z.coerce.number().int().min(1999),
    stream: z.string().nullish(),
    house: z.string().nullish(),
    notableTeachers: z.string().nullish(),
    currentLocation: z.string().nullish(),
    occupation: z.string().nullish(),
    linkedinUrl: z.string().nullish(),
    howTheyHeard: z.string().nullish(),
    phone: z.string().nullish(),
    ref: z.string().optional(),
    consent: z.object({
      dataProcessing: z.boolean(),
      policyAgreement: z.boolean(),
      directory: z.boolean(),
      newsletter: z.boolean(),
    }),
  })
  .refine((v) => v.consent.dataProcessing, {
    message: "Data processing consent is required.",
    path: ["consent", "dataProcessing"],
  })
  .refine((v) => v.consent.policyAgreement, {
    message: "Privacy Policy and Terms agreement is required.",
    path: ["consent", "policyAgreement"],
  });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = joinWithAccountSchema.parse(json);

    const user = await db.query.users.findFirst({
      where: eq(users.email, payload.email.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json(
        { message: "User account was not found." },
        { status: 404 },
      );
    }

    const now = new Date();

    const locationParts = payload.currentLocation?.split(",") ?? [];
    const locationCity = locationParts[0]?.trim() || null;
    const locationCountry =
      locationParts.length > 1 ? locationParts[locationParts.length - 1]!.trim() : null;

    await db.transaction(async (tx) => {
      await tx
        .insert(alumniProfiles)
        .values({
          userId: user.id,
          firstName: payload.firstName,
          lastName: payload.lastName || "",
          graduationYear: payload.graduationYear,
          yearOfCompletion: payload.graduationYear,
          stream: payload.stream || null,
          house: payload.house || null,
          notableTeachers: payload.notableTeachers || null,
          howTheyHeard: payload.ref || payload.howTheyHeard || null,
          locationCity,
          locationCountry,
          currentJobTitle: payload.occupation || null,
          phone: payload.phone || null,
          linkedinUrl: payload.linkedinUrl || null,
          verificationStatus: "pending",
          membershipTier: "standard",
          isAvailableForMentorship: false,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: alumniProfiles.userId,
          set: {
            firstName: payload.firstName,
            lastName: payload.lastName || "",
            graduationYear: payload.graduationYear,
            yearOfCompletion: payload.graduationYear,
            stream: payload.stream || null,
            house: payload.house || null,
            notableTeachers: payload.notableTeachers || null,
            howTheyHeard: payload.ref || payload.howTheyHeard || null,
            locationCity,
            locationCountry,
            currentJobTitle: payload.occupation || null,
            phone: payload.phone || null,
            linkedinUrl: payload.linkedinUrl || null,
            verificationStatus: "pending",
            updatedAt: now,
          },
        });

      await tx
        .insert(privacySettings)
        .values({
          userId: user.id,
          showInDirectory: payload.consent.directory,
          showEmail: false,
          showPhone: false,
          showEmployer: true,
          availableForMentorship: false,
          showOnDonorWall: true,
          receiveEventReminders: true,
          receiveNewsletter: payload.consent.newsletter,
          receiveMentorshipNotifications: true,
          receiveDonationCampaignUpdates: true,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: privacySettings.userId,
          set: {
            showInDirectory: payload.consent.directory,
            receiveNewsletter: payload.consent.newsletter,
            updatedAt: now,
          },
        });

      await tx.insert(consentLogs).values([
        {
          userId: user.id,
          consentType: "data_processing",
          granted: payload.consent.dataProcessing,
        },
        {
          userId: user.id,
          consentType: "directory",
          granted: payload.consent.directory,
        },
        {
          userId: user.id,
          consentType: "marketing",
          granted: payload.consent.newsletter,
        },
      ]);
    });

    await trackPortalEvent({
      event: "user_registered",
      userId: user.id,
      properties: {
        yearOfCompletion: payload.graduationYear,
        country: locationCountry ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Failed to complete registration." },
      { status: 500 },
    );
  }
}
