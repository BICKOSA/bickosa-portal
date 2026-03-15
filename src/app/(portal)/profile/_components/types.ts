import type { consentTypeEnum, membershipTierEnum, verificationStatusEnum } from "@/lib/db/schema";

export type ProfileVerificationStatus = (typeof verificationStatusEnum.enumValues)[number];
export type ProfileMembershipTier = (typeof membershipTierEnum.enumValues)[number];
export type ConsentType = (typeof consentTypeEnum.enumValues)[number];

export type ProfileViewData = {
  userId: string;
  firstName: string;
  lastName: string;
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
  avatarKey: string | null;
  avatarUrl: string | null;
  verificationStatus: ProfileVerificationStatus;
  chapterName: string | null;
  membershipTier: ProfileMembershipTier;
  membershipExpiresAt: string | null;
};

export type PrivacySettingsViewData = {
  showInDirectory: boolean;
  showEmail: boolean;
  showPhone: boolean;
  availableForMentorship: boolean;
  receiveEventReminders: boolean;
  receiveNewsletter: boolean;
  showOnDonorWall: boolean;
};

export type ConsentLogViewData = {
  id: string;
  consentType: ConsentType;
  granted: boolean;
  createdAt: string;
};
