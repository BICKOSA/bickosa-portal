"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  ConsentLogViewData,
  PrivacySettingsViewData,
} from "@/app/(portal)/profile/_components/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";

type PrivacySettingKey = keyof PrivacySettingsViewData;

type PrivacySettingsPageClientProps = {
  initialPrivacy: PrivacySettingsViewData;
  consentLogs: ConsentLogViewData[];
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const visibilityKeys: PrivacySettingKey[] = [
  "showInDirectory",
  "showEmail",
  "showPhone",
  "showEmployer",
  "availableForMentorship",
  "showOnDonorWall",
];

const communicationKeys: PrivacySettingKey[] = [
  "receiveEventReminders",
  "receiveNewsletter",
  "receiveMentorshipNotifications",
  "receiveDonationCampaignUpdates",
];

const settingLabels: Record<PrivacySettingKey, { label: string; description: string }> = {
  showInDirectory: {
    label: "Show in alumni directory",
    description: "Allow your profile to appear in the verified alumni directory.",
  },
  showEmail: {
    label: "Show email to other members",
    description: "Display your email address to verified alumni members.",
  },
  showPhone: {
    label: "Show phone number",
    description: "Display your phone number to verified alumni members.",
  },
  showEmployer: {
    label: "Show current employer",
    description: "Display your current employer in your profile card.",
  },
  availableForMentorship: {
    label: "Available as mentor",
    description: "Allow other members to discover you for mentorship requests.",
  },
  showOnDonorWall: {
    label: "Appear on donor wall",
    description: "Show your name publicly when you donate to campaigns.",
  },
  receiveEventReminders: {
    label: "Receive event reminders",
    description: "Get reminder notifications for upcoming events you are attending.",
  },
  receiveNewsletter: {
    label: "Receive monthly newsletter",
    description: "Receive a monthly digest with alumni updates and highlights.",
  },
  receiveMentorshipNotifications: {
    label: "Receive mentorship notifications",
    description: "Get notified about mentorship requests and request responses.",
  },
  receiveDonationCampaignUpdates: {
    label: "Receive donation campaign updates",
    description: "Get notified when new fundraising campaigns are published.",
  },
};

const consentTypeLabels: Record<string, string> = {
  data_processing: "Data Processing",
  directory: "Directory Listing",
  marketing: "Marketing / Newsletter",
  photography: "Photography",
};

function maskIpAddress(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  if (value.includes(".")) {
    const segments = value.split(".");
    if (segments.length === 4) {
      return `${segments[0]}.${segments[1]}.*.*`;
    }
  }

  if (value.includes(":")) {
    const segments = value.split(":").filter(Boolean);
    if (segments.length >= 2) {
      return `${segments[0]}:${segments[1]}::****`;
    }
  }

  return "Masked";
}

export function PrivacySettingsPageClient({
  initialPrivacy,
  consentLogs,
}: PrivacySettingsPageClientProps) {
  const [privacy, setPrivacy] = useState<PrivacySettingsViewData>(initialPrivacy);
  const [updatingKey, setUpdatingKey] = useState<PrivacySettingKey | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmittingDeleteRequest, setIsSubmittingDeleteRequest] = useState(false);

  const orderedConsentLogs = useMemo(() => consentLogs, [consentLogs]);

  async function updateSetting(setting: PrivacySettingKey, value: boolean) {
    const previous = privacy[setting];
    setPrivacy((prev) => ({ ...prev, [setting]: value }));
    setUpdatingKey(setting);

    try {
      const response = await fetch("/api/profile/privacy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setting, value }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Unable to update this setting.");
      }

      const body = (await response.json()) as {
        privacy: PrivacySettingsViewData;
      };
      setPrivacy(body.privacy);
      toast.success("Privacy setting updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update this setting.";
      setPrivacy((prev) => ({ ...prev, [setting]: previous }));
      toast.error(message);
    } finally {
      setUpdatingKey(null);
    }
  }

  async function submitDeletionRequest() {
    setIsSubmittingDeleteRequest(true);
    try {
      const response = await fetch("/api/privacy/delete-request", {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Unable to submit deletion request.");
      }

      toast.success("Deletion request submitted. We will process it within 30 days.");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit deletion request.";
      toast.error(message);
    } finally {
      setIsSubmittingDeleteRequest(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Privacy & Data Controls"
        description="Manage visibility, communication preferences, and your personal data rights under Uganda's DPPA 2019."
      />

      <Card>
        <CardHeader>
          <CardTitle>Directory & Visibility</CardTitle>
          <CardDescription>Control what other alumni can see about you in the portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibilityKeys.map((key) => (
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
                checked={privacy[key]}
                disabled={updatingKey === key}
                onChange={(event) => updateSetting(key, event.target.checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communications</CardTitle>
          <CardDescription>Choose which updates and notifications you would like to receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {communicationKeys.map((key) => (
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
                checked={privacy[key]}
                disabled={updatingKey === key}
                onChange={(event) => updateSetting(key, event.target.checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card variant="navy-tint" accentBar>
        <CardHeader>
          <CardTitle>Your Data Rights (DPPA 2019)</CardTitle>
          <CardDescription>
            Under Uganda&apos;s Data Protection &amp; Privacy Act (Act 9 of 2019), you have the following rights:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">Right to Access</p>
              <p className="text-xs text-[var(--text-3)]">Request a machine-readable copy of your personal data.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/api/privacy/export">Download Your Data</a>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">Right to Rectification</p>
              <p className="text-xs text-[var(--text-3)]">Correct inaccurate or outdated profile information.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">Edit Profile</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">Right to Erasure</p>
              <p className="text-xs text-[var(--text-3)]">Request account deletion in line with legal retention duties.</p>
            </div>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm">Request Account Deletion</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm deletion request</DialogTitle>
                  <DialogDescription>
                    We will receive your request immediately and process it within 30 days. Some records may be
                    retained in anonymized form for financial and governance obligations.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isSubmittingDeleteRequest}
                  >
                    Cancel
                  </Button>
                  <Button variant="navy" onClick={submitDeletionRequest} isLoading={isSubmittingDeleteRequest}>
                    Submit request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">Right to Data Portability</p>
              <p className="text-xs text-[var(--text-3)]">Export your data in JSON format for transfer and reuse.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/api/privacy/export">Export Your Data (JSON)</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consent History</CardTitle>
          <CardDescription>Read-only history of consent changes on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {orderedConsentLogs.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">No consent history recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consent Type</TableHead>
                  <TableHead>Granted / Withdrawn</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedConsentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{consentTypeLabels[log.consentType] ?? log.consentType}</TableCell>
                    <TableCell>{log.granted ? "Granted" : "Withdrawn"}</TableCell>
                    <TableCell>{DATE_TIME_FORMATTER.format(new Date(log.createdAt))}</TableCell>
                    <TableCell>{maskIpAddress(log.ipAddress)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
