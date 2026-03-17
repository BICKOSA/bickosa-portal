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

const onboardingSchema = z
  .object({
    email: z.email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    yearOfEntry: z.coerce.number().int().min(1900),
    yearOfCompletion: z.coerce.number().int().min(1900),
    currentJobTitle: z.string().min(1),
    currentEmployer: z.string().min(1),
    industry: z.string().min(1),
    locationCity: z.string().min(1),
    locationCountry: z.string().min(1),
    phone: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .regex(/^\+?[0-9()\-\s]{7,20}$/),
      ])
      .optional(),
    consent: z.object({
      dataProcessing: z.boolean(),
      policyAgreement: z.boolean(),
      directory: z.boolean(),
      newsletter: z.boolean(),
      photography: z.boolean(),
    }),
  })
  .refine((value) => value.yearOfCompletion >= value.yearOfEntry + 3, {
    message: "Year of completion must be at least 3 years after entry.",
    path: ["yearOfCompletion"],
  })
  .refine((value) => value.consent.dataProcessing, {
    message: "Data processing consent is required.",
    path: ["consent", "dataProcessing"],
  })
  .refine((value) => value.consent.policyAgreement, {
    message: "Privacy Policy and Terms agreement is required.",
    path: ["consent", "policyAgreement"],
  });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = onboardingSchema.parse(json);

    const user = await db.query.users.findFirst({
      where: eq(users.email, payload.email.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json(
        { message: "User account was not found for onboarding." },
        { status: 404 },
      );
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .insert(alumniProfiles)
        .values({
          userId: user.id,
          firstName: payload.firstName,
          lastName: payload.lastName,
          yearOfEntry: payload.yearOfEntry,
          yearOfCompletion: payload.yearOfCompletion,
          currentJobTitle: payload.currentJobTitle,
          currentEmployer: payload.currentEmployer,
          industry: payload.industry,
          locationCity: payload.locationCity,
          locationCountry: payload.locationCountry,
          phone: payload.phone || null,
          verificationStatus: "pending",
          membershipTier: "standard",
          isAvailableForMentorship: false,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: alumniProfiles.userId,
          set: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            yearOfEntry: payload.yearOfEntry,
            yearOfCompletion: payload.yearOfCompletion,
            currentJobTitle: payload.currentJobTitle,
            currentEmployer: payload.currentEmployer,
            industry: payload.industry,
            locationCity: payload.locationCity,
            locationCountry: payload.locationCountry,
            phone: payload.phone || null,
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
        {
          userId: user.id,
          consentType: "photography",
          granted: payload.consent.photography,
        },
      ]);
    });

    await trackPortalEvent({
      event: "user_registered",
      userId: user.id,
      properties: {
        yearOfCompletion: payload.yearOfCompletion,
        industry: payload.industry,
        country: payload.locationCountry,
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
      { message: "Failed to complete onboarding." },
      { status: 500 },
    );
  }
}
