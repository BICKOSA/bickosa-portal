import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
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

const onboardingSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name is required.")
      .max(120)
      .refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, {
        message: "Please enter both your first and last name.",
      }),
    graduationYear: z.coerce
      .number()
      .int()
      .min(1999, "Choose your graduation year.")
      .max(new Date().getFullYear() + 1),
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
    occupation: z.string().trim().min(2, "Occupation is required.").max(255),
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
    consent: z
      .object({
        dataProcessing: z.boolean(),
        policyAgreement: z.boolean(),
        directory: z.boolean(),
        newsletter: z.boolean(),
      })
      .refine((value) => value.dataProcessing, {
        message: "Data processing consent is required.",
        path: ["dataProcessing"],
      })
      .refine((value) => value.policyAgreement, {
        message: "Privacy Policy and Terms agreement is required.",
        path: ["policyAgreement"],
      }),
  });

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const json = await request.json();
    const payload = onboardingSchema.parse(json);

    const userId = session.user.id;
    const userEmail = (session.user.email ?? "").toLowerCase();
    const now = new Date();

    const nameParts = payload.fullName.trim().replace(/\s+/g, " ").split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const locationParts = payload.currentLocation.split(",");
    const locationCity = locationParts[0]?.trim() || null;
    const locationCountry =
      locationParts.length > 1 ? locationParts[locationParts.length - 1]!.trim() : null;

    await db.transaction(async (tx) => {
      // Keep the users.name in sync with what the user typed (OAuth providers
      // sometimes give a generic "John" — let them confirm both names here).
      if (payload.fullName.trim() && payload.fullName.trim() !== session.user.name) {
        await tx
          .update(users)
          .set({ name: payload.fullName.trim(), updatedAt: now })
          .where(eq(users.id, userId));
      }

      await tx
        .insert(alumniProfiles)
        .values({
          userId,
          firstName,
          lastName,
          graduationYear: payload.graduationYear,
          yearOfCompletion: payload.graduationYear,
          stream: payload.stream || null,
          house: payload.house || null,
          notableTeachers: payload.notableTeachers,
          howTheyHeard: payload.ref || payload.howTheyHeard,
          locationCity,
          locationCountry,
          currentJobTitle: payload.occupation,
          phone: payload.phone,
          linkedinUrl: payload.linkedinUrl || null,
          verificationStatus: "pending",
          membershipTier: "standard",
          isAvailableForMentorship: false,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: alumniProfiles.userId,
          set: {
            firstName,
            lastName,
            graduationYear: payload.graduationYear,
            yearOfCompletion: payload.graduationYear,
            stream: payload.stream || null,
            house: payload.house || null,
            notableTeachers: payload.notableTeachers,
            howTheyHeard: payload.ref || payload.howTheyHeard,
            locationCity,
            locationCountry,
            currentJobTitle: payload.occupation,
            phone: payload.phone,
            linkedinUrl: payload.linkedinUrl || null,
            verificationStatus: "pending",
            updatedAt: now,
          },
        });

      await tx
        .insert(privacySettings)
        .values({
          userId,
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
          userId,
          consentType: "data_processing",
          granted: payload.consent.dataProcessing,
        },
        {
          userId,
          consentType: "directory",
          granted: payload.consent.directory,
        },
        {
          userId,
          consentType: "marketing",
          granted: payload.consent.newsletter,
        },
      ]);

      // Attach any prior off-platform nominations sent to this email to the
      // new user (same logic as /api/public/join-with-account).
      if (userEmail) {
        await tx
          .update(nominations)
          .set({ nomineeId: userId, updatedAt: now })
          .where(
            and(
              isNull(nominations.nomineeId),
              eq(sql`lower(${nominations.nomineeEmail})`, userEmail),
            ),
          );
      }
    });

    await trackPortalEvent({
      event: "user_registered",
      userId,
      properties: {
        yearOfCompletion: payload.graduationYear,
        country: locationCountry ?? null,
        source: "social_onboarding",
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
    console.error("[onboarding] complete failed", error);
    return NextResponse.json(
      { message: "Failed to complete onboarding." },
      { status: 500 },
    );
  }
}
