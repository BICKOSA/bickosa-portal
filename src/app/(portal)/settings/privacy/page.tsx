import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type {
  ConsentLogViewData,
  PrivacySettingsViewData,
} from "@/app/(portal)/profile/_components/types";
import { PrivacySettingsPageClient } from "@/app/(portal)/settings/privacy/_components/privacy-settings-page-client";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { consentLogs, privacySettings } from "@/lib/db/schema";

function toPrivacyViewData(
  row: typeof privacySettings.$inferSelect | null | undefined,
): PrivacySettingsViewData {
  return {
    showInDirectory: row?.showInDirectory ?? true,
    showEmail: row?.showEmail ?? false,
    showPhone: row?.showPhone ?? false,
    showEmployer: row?.showEmployer ?? true,
    availableForMentorship: row?.availableForMentorship ?? false,
    showOnDonorWall: row?.showOnDonorWall ?? true,
    receiveEventReminders: row?.receiveEventReminders ?? true,
    receiveNewsletter: row?.receiveNewsletter ?? true,
    receiveMentorshipNotifications: row?.receiveMentorshipNotifications ?? true,
    receiveDonationCampaignUpdates: row?.receiveDonationCampaignUpdates ?? true,
  };
}

export default async function PrivacySettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const [privacyRow, consentRows] = await Promise.all([
    db.query.privacySettings.findFirst({
      where: eq(privacySettings.userId, session.user.id),
    }),
    db.query.consentLogs.findMany({
      where: eq(consentLogs.userId, session.user.id),
      orderBy: [desc(consentLogs.createdAt)],
    }),
  ]);

  const consent: ConsentLogViewData[] = consentRows.map((log) => ({
    id: log.id,
    consentType: log.consentType,
    granted: log.granted,
    createdAt: log.createdAt.toISOString(),
    ipAddress: log.ipAddress,
  }));

  return (
    <PrivacySettingsPageClient
      initialPrivacy={toPrivacyViewData(privacyRow)}
      consentLogs={consent}
    />
  );
}
