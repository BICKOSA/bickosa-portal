"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";

import type {
  ConsentLogViewData,
  PrivacySettingsViewData,
} from "@/app/(portal)/profile/_components/types";

type PrivacySettingKey = keyof PrivacySettingsViewData;

type PrivacySettingsFormProps = {
  privacy: PrivacySettingsViewData;
  consentLogs: ConsentLogViewData[];
  onPrivacyUpdated: (privacy: PrivacySettingsViewData) => void;
};

const settingLabels: Record<PrivacySettingKey, { label: string; description: string }> = {
  showInDirectory: {
    label: "Show in Alumni Directory",
    description: "Allow your public profile to appear in the verified alumni directory.",
  },
  showEmail: {
    label: "Show Email Address (to verified members)",
    description: "Let verified members see your email in your profile card.",
  },
  showPhone: {
    label: "Show Phone Number (to verified members only)",
    description: "Allow verified members to view your phone number.",
  },
  showEmployer: {
    label: "Show Current Employer",
    description: "Display your current employer to verified members in your profile.",
  },
  availableForMentorship: {
    label: "Available for Mentorship",
    description: "Show that you are available to mentor fellow alumni.",
  },
  receiveEventReminders: {
    label: "Receive Event Reminders",
    description: "Get reminders for events and RSVPs that matter to you.",
  },
  receiveNewsletter: {
    label: "Receive Monthly Newsletter",
    description: "Receive curated monthly updates on community activity.",
  },
  receiveMentorshipNotifications: {
    label: "Receive Mentorship Notifications",
    description: "Get updates for mentorship requests and accepted matches.",
  },
  receiveDonationCampaignUpdates: {
    label: "Receive Donation Campaign Updates",
    description: "Receive updates when new fundraising campaigns go live.",
  },
  showOnDonorWall: {
    label: "Appear on Donor Wall after donations",
    description: "Display your name publicly when you support campaigns.",
  },
};

const orderedKeys: PrivacySettingKey[] = [
  "showInDirectory",
  "showEmail",
  "showPhone",
  "showEmployer",
  "availableForMentorship",
  "receiveEventReminders",
  "receiveNewsletter",
  "receiveMentorshipNotifications",
  "receiveDonationCampaignUpdates",
  "showOnDonorWall",
];

export function PrivacySettingsForm({
  privacy,
  consentLogs,
  onPrivacyUpdated,
}: PrivacySettingsFormProps) {
  const [state, setState] = useState<PrivacySettingsViewData>(privacy);
  const [updatingKey, setUpdatingKey] = useState<PrivacySettingKey | null>(null);

  const recentLogs = useMemo(() => consentLogs.slice(0, 3), [consentLogs]);

  async function updateSetting(setting: PrivacySettingKey, value: boolean) {
    const previous = state[setting];
    setState((prev) => ({ ...prev, [setting]: value }));
    setUpdatingKey(setting);

    try {
      const response = await fetch("/api/profile/privacy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setting, value }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Failed to save privacy settings.");
      }

      const body = (await response.json()) as {
        privacy: PrivacySettingsViewData;
      };
      setState(body.privacy);
      onPrivacyUpdated(body.privacy);
      toast.success("Privacy setting updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update this setting.";
      setState((prev) => ({ ...prev, [setting]: previous }));
      toast.error(message);
    } finally {
      setUpdatingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
        <CardDescription>
          Manage what other members can view and how we communicate with you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orderedKeys.map((key) => (
          <div
            key={key}
            className="flex items-start justify-between gap-4 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3"
          >
            <div className="max-w-xl">
              <p className="text-sm font-medium text-[var(--text-1)]">{settingLabels[key].label}</p>
              <p className="mt-1 text-xs text-[var(--text-3)]">{settingLabels[key].description}</p>
            </div>
            <Toggle
              aria-label={settingLabels[key].label}
              checked={state[key]}
              disabled={updatingKey === key}
              onChange={(event) => updateSetting(key, event.target.checked)}
            />
          </div>
        ))}

        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--navy-50)] p-3 text-xs text-[var(--text-2)]">
          Your data is handled under Uganda&apos;s Data Protection &amp; Privacy Act 2019. Read
          our{" "}
          <Link href="/privacy-policy" className="font-medium text-[var(--navy-700)] underline">
            Privacy Policy
          </Link>
          .
        </div>

        {recentLogs.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
              Recent consent updates
            </p>
            {recentLogs.map((log) => (
              <p key={log.id} className="text-xs text-[var(--text-3)]">
                {log.consentType} set to {log.granted ? "enabled" : "disabled"} on{" "}
                {new Date(log.createdAt).toLocaleDateString("en-UG")}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
