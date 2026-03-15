import { eq } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import type { PrivacySettingsViewData } from "@/app/(portal)/profile/_components/types";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  consentLogs,
  type consentTypeEnum,
  privacySettings,
} from "@/lib/db/schema";

type ConsentType = (typeof consentTypeEnum.enumValues)[number];
type PrivacyKey = keyof PrivacySettingsViewData;

const privacyPatchSchema = z.object({
  setting: z.enum([
    "showInDirectory",
    "showEmail",
    "showPhone",
    "availableForMentorship",
    "receiveEventReminders",
    "receiveNewsletter",
    "showOnDonorWall",
  ]),
  value: z.boolean(),
});

const consentTypeBySetting: Record<PrivacyKey, ConsentType> = {
  showInDirectory: "directory",
  receiveNewsletter: "marketing",
  showEmail: "data_processing",
  showPhone: "data_processing",
  availableForMentorship: "data_processing",
  receiveEventReminders: "data_processing",
  showOnDonorWall: "data_processing",
};

function normalizePrivacyRow(
  row: typeof privacySettings.$inferSelect | null | undefined,
): PrivacySettingsViewData {
  return {
    showInDirectory: row?.showInDirectory ?? true,
    showEmail: row?.showEmail ?? false,
    showPhone: row?.showPhone ?? false,
    availableForMentorship: row?.availableForMentorship ?? false,
    receiveEventReminders: row?.receiveEventReminders ?? true,
    receiveNewsletter: row?.receiveNewsletter ?? true,
    showOnDonorWall: row?.showOnDonorWall ?? true,
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

    const payload = privacyPatchSchema.parse(await request.json());
    const now = new Date();

    const existing = await db.query.privacySettings.findFirst({
      where: eq(privacySettings.userId, session.user.id),
    });

    const current = normalizePrivacyRow(existing);
    const next: PrivacySettingsViewData = {
      ...current,
      [payload.setting]: payload.value,
    };

    await db
      .insert(privacySettings)
      .values({
        userId: session.user.id,
        showInDirectory: next.showInDirectory,
        showEmail: next.showEmail,
        showPhone: next.showPhone,
        availableForMentorship: next.availableForMentorship,
        receiveEventReminders: next.receiveEventReminders,
        receiveNewsletter: next.receiveNewsletter,
        showOnDonorWall: next.showOnDonorWall,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: privacySettings.userId,
        set: {
          showInDirectory: next.showInDirectory,
          showEmail: next.showEmail,
          showPhone: next.showPhone,
          availableForMentorship: next.availableForMentorship,
          receiveEventReminders: next.receiveEventReminders,
          receiveNewsletter: next.receiveNewsletter,
          showOnDonorWall: next.showOnDonorWall,
          updatedAt: now,
        },
      });

    if (payload.setting === "availableForMentorship") {
      await db
        .update(alumniProfiles)
        .set({
          isAvailableForMentorship: payload.value,
          updatedAt: now,
        })
        .where(eq(alumniProfiles.userId, session.user.id));
    }

    await db.insert(consentLogs).values({
      userId: session.user.id,
      consentType: consentTypeBySetting[payload.setting],
      granted: payload.value,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: request.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      privacy: next,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Failed to update privacy settings." }, { status: 500 });
  }
}
