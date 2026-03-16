import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignUpdatesPanel } from "@/app/(portal)/portal/donate/[slug]/_components/campaign-updates-panel";
import { Button } from "@/components/ui/button";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminCampaignById } from "@/lib/admin-campaigns";
import { listCampaignUpdatesByCampaignId } from "@/lib/admin-campaign-updates";

type AdminCampaignUpdatesComposerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCampaignUpdatesComposerPage({
  params,
}: AdminCampaignUpdatesComposerPageProps) {
  await requireAdminPageSession();
  const { id } = await params;

  const campaign = await getAdminCampaignById(id);
  if (!campaign) {
    notFound();
  }

  const updates = await listCampaignUpdatesByCampaignId(id);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
            Updates Composer
          </h1>
          <p className="text-sm text-[var(--text-2)]">
            Moderate and manage update history for{" "}
            <span className="font-semibold text-[var(--text-1)]">{campaign.title}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/campaigns/${campaign.id}/edit`}>Edit Campaign</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/campaigns">All Campaigns</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
        <CampaignUpdatesPanel campaignId={campaign.id} canManage initialUpdates={updates} />
      </div>
    </section>
  );
}
