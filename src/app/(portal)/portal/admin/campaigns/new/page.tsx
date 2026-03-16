import { CampaignForm } from "@/app/(portal)/portal/admin/campaigns/_components/campaign-form";
import { requireAdminPageSession } from "@/lib/admin-auth";

export default async function AdminNewCampaignPage() {
  await requireAdminPageSession();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
          New Campaign
        </h1>
        <p className="text-sm text-[var(--text-2)]">
          Create a new campaign and configure how it appears to members.
        </p>
      </div>
      <CampaignForm mode="create" />
    </section>
  );
}
