import { notFound } from "next/navigation";

import { CampaignForm } from "@/app/(portal)/portal/admin/campaigns/_components/campaign-form";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { getAdminCampaignById } from "@/lib/admin-campaigns";

type AdminEditCampaignPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditCampaignPage({ params }: AdminEditCampaignPageProps) {
  await requireAdminPageSession();
  const { id } = await params;
  const campaign = await getAdminCampaignById(id);
  if (!campaign) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
          Edit Campaign
        </h1>
        <p className="text-sm text-[var(--text-2)]">
          Update campaign details, publishing, and fundraising metadata.
        </p>
      </div>
      <CampaignForm mode="edit" campaign={campaign} />
    </section>
  );
}
