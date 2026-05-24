import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  consentLogs,
  nominations,
  privacySettings,
  users,
} from "@/lib/db/schema";
import { trackPortalEvent } from "@/lib/analytics/server";

const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
const LINKEDIN_URL_REGEX = /linkedin\.com\//i;

const joinWithAccountSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(255)
      .pipe(z.email("Enter a valid email address.")),
    firstName: z.string().trim().min(1, "First name is required.").max(120),
    lastName: z.string().trim().max(120),
    graduationYear: z.coerce
      .number()
      .int()
      .min(1999, "Choose your graduation year.")
      .max(new Date().getFullYear() + 1, "Year cannot be in the future."),
    stream: z.string().trim().max(120).nullish(),
    house: z.string().trim().max(120).nullish(),
    notableTeachers: z
      .string()
      .trim()
      .min(3, "Notable teacher or classmate is required.")
      .max(500),
    currentLocation: z
      .string()
      .trim()
      .min(3, "Current location is required.")
      .max(255),
    occupation: z
      .string()
      .trim()
      .min(2, "Occupation is required.")
      .max(255),
    linkedinUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .url("Enter a valid LinkedIn URL.")
          .regex(LINKEDIN_URL_REGEX, "Use the URL to your LinkedIn profile."),
      ])
      .nullish(),
    howTheyHeard: z
      .string()
      .trim()
      .min(1, "Tell us how you heard about us.")
      .max(255),
    phone: z
      .string()
      .trim()
      .min(7, "Phone number is required.")
      .max(20)
      .regex(PHONE_REGEX, "Enter a valid phone number."),
    ref: z.string().trim().max(120).optional(),
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

      // Attach this user to any off-platform nominations that captured the
      // same email, so they show up in the viewer's "Pending nominations
      // requiring action" panel once they sign in.
      await tx
        .update(nominations)
        .set({ nomineeId: user.id, updatedAt: now })
        .where(
          and(
            isNull(nominations.nomineeId),
            eq(
              sql`lower(${nominations.nomineeEmail})`,
              payload.email.toLowerCase(),
            ),
          ),
        );
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
