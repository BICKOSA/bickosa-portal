"use client";

import { useState } from "react";

import { AvatarUpload } from "@/app/(portal)/profile/_components/avatar-upload";
import { MembershipCard } from "@/app/(portal)/profile/_components/membership-card";
import { PersonalInfoForm } from "@/app/(portal)/profile/_components/personal-info-form";
import { PrivacySettingsForm } from "@/app/(portal)/profile/_components/privacy-settings-form";
import { ProfileHeader } from "@/app/(portal)/profile/_components/profile-header";
import type {
  ConsentLogViewData,
  PrivacySettingsViewData,
  ProfileViewData,
} from "@/app/(portal)/profile/_components/types";

type ProfilePageClientProps = {
  initialProfile: ProfileViewData;
  initialPrivacy: PrivacySettingsViewData;
  initialConsentLogs: ConsentLogViewData[];
};

export function ProfilePageClient({
  initialProfile,
  initialPrivacy,
  initialConsentLogs,
}: ProfilePageClientProps) {
  const [profile, setProfile] = useState<ProfileViewData>(initialProfile);
  const [privacy, setPrivacy] = useState<PrivacySettingsViewData>(initialPrivacy);

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  return (
    <div className="space-y-6">
      <ProfileHeader profile={profile} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <PersonalInfoForm profile={profile} onProfileUpdated={setProfile} />
          <PrivacySettingsForm
            privacy={privacy}
            consentLogs={initialConsentLogs}
            onPrivacyUpdated={setPrivacy}
          />
        </div>

        <div className="space-y-6">
          <AvatarUpload
            fullName={fullName}
            currentAvatarUrl={profile.avatarUrl}
            onAvatarUpdated={(avatarUrl, avatarKey) =>
              setProfile((prev) => ({ ...prev, avatarUrl, avatarKey }))
            }
          />
          <MembershipCard profile={profile} />
        </div>
      </div>
    </div>
  );
}
