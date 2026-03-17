import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPageSession } from "@/lib/admin-auth";
import {
  listCohortOptions,
  listWhatsappGroups,
  referralLinkPerformance,
} from "@/lib/alumni-growth";
import { OutreachAdminClient } from "@/app/(portal)/portal/admin/outreach/_components/outreach-admin-client";

export default async function AdminOutreachPage() {
  await requireAdminPageSession();
  const [groups, linkPerformance, cohortOptions] = await Promise.all([
    listWhatsappGroups(),
    referralLinkPerformance(),
    listCohortOptions(),
  ]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Outreach Channels"
        description="Manage WhatsApp groups and track registration link performance."
      />
      <OutreachAdminClient
        groups={groups}
        linkPerformance={linkPerformance}
        cohortOptions={cohortOptions}
        appUrl={appUrl}
      />
    </section>
  );
}
