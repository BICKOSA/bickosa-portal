import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ProfilePageClient } from "@/app/(portal)/profile/_components/profile-page-client";
import type {
  ConsentLogViewData,
  PrivacySettingsViewData,
  ProfileViewData,
} from "@/app/(portal)/profile/_components/types";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  chapters,
  consentLogs,
  privacySettings,
} from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

async function getProfilePageData(userId: string): Promise<{
  profile: ProfileViewData;
  privacy: PrivacySettingsViewData;
  consent: ConsentLogViewData[];
}> {
  const [profileRow] = await db
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
      bio: alumniProfiles.bio,
      linkedinUrl: alumniProfiles.linkedinUrl,
      websiteUrl: alumniProfiles.websiteUrl,
      avatarKey: alumniProfiles.avatarKey,
      verificationStatus: alumniProfiles.verificationStatus,
      membershipTier: alumniProfiles.membershipTier,
      membershipExpiresAt: alumniProfiles.membershipExpiresAt,
      chapterName: chapters.name,
    })
    .from(alumniProfiles)
    .leftJoin(chapters, eq(alumniProfiles.chapterId, chapters.id))
    .where(eq(alumniProfiles.userId, userId))
    .limit(1);

  if (!profileRow) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const firstName = session?.user.name?.split(" ")[0] || "BICKOSA";
    const lastName = session?.user.name?.split(" ").slice(1).join(" ") || "Member";

    const [createdProfile] = await db
      .insert(alumniProfiles)
      .values({
        userId,
        firstName,
        lastName,
      })
      .returning();

    return {
      profile: {
        userId,
        firstName: createdProfile.firstName,
        lastName: createdProfile.lastName,
        yearOfEntry: createdProfile.yearOfEntry,
        yearOfCompletion: createdProfile.yearOfCompletion,
        currentJobTitle: createdProfile.currentJobTitle,
        currentEmployer: createdProfile.currentEmployer,
        industry: createdProfile.industry,
        locationCity: createdProfile.locationCity,
        locationCountry: createdProfile.locationCountry,
        bio: createdProfile.bio,
        linkedinUrl: createdProfile.linkedinUrl,
        websiteUrl: createdProfile.websiteUrl,
        avatarKey: createdProfile.avatarKey,
        avatarUrl: createdProfile.avatarKey ? buildR2PublicUrl(createdProfile.avatarKey) : null,
        verificationStatus: createdProfile.verificationStatus,
        chapterName: null,
        membershipTier: createdProfile.membershipTier,
        membershipExpiresAt: createdProfile.membershipExpiresAt?.toISOString() ?? null,
      },
      privacy: {
        showInDirectory: true,
        showEmail: false,
        showPhone: false,
        availableForMentorship: false,
        receiveEventReminders: true,
        receiveNewsletter: true,
        showOnDonorWall: true,
      },
      consent: [],
    };
  }

  const privacyRow = await db.query.privacySettings.findFirst({
    where: eq(privacySettings.userId, userId),
  });

  const consentRows = await db.query.consentLogs.findMany({
    where: eq(consentLogs.userId, userId),
    orderBy: [desc(consentLogs.createdAt)],
    limit: 12,
  });

  return {
    profile: {
      userId: profileRow.userId,
      firstName: profileRow.firstName,
      lastName: profileRow.lastName,
      yearOfEntry: profileRow.yearOfEntry,
      yearOfCompletion: profileRow.yearOfCompletion,
      currentJobTitle: profileRow.currentJobTitle,
      currentEmployer: profileRow.currentEmployer,
      industry: profileRow.industry,
      locationCity: profileRow.locationCity,
      locationCountry: profileRow.locationCountry,
      bio: profileRow.bio,
      linkedinUrl: profileRow.linkedinUrl,
      websiteUrl: profileRow.websiteUrl,
      avatarKey: profileRow.avatarKey,
      avatarUrl: profileRow.avatarKey ? buildR2PublicUrl(profileRow.avatarKey) : null,
      verificationStatus: profileRow.verificationStatus,
      chapterName: profileRow.chapterName,
      membershipTier: profileRow.membershipTier,
      membershipExpiresAt: profileRow.membershipExpiresAt?.toISOString() ?? null,
    },
    privacy: {
      showInDirectory: privacyRow?.showInDirectory ?? true,
      showEmail: privacyRow?.showEmail ?? false,
      showPhone: privacyRow?.showPhone ?? false,
      availableForMentorship: privacyRow?.availableForMentorship ?? false,
      receiveEventReminders: privacyRow?.receiveEventReminders ?? true,
      receiveNewsletter: privacyRow?.receiveNewsletter ?? true,
      showOnDonorWall: privacyRow?.showOnDonorWall ?? true,
    },
    consent: consentRows.map((log) => ({
      id: log.id,
      consentType: log.consentType,
      granted: log.granted,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const data = await getProfilePageData(session.user.id);

  return (
    <section>
      <ProfilePageClient
        initialProfile={data.profile}
        initialPrivacy={data.privacy}
        initialConsentLogs={data.consent}
      />
    </section>
  );
}
