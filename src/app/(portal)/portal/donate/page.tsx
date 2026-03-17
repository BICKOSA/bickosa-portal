import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HandHeart } from "lucide-react";

import { CampaignCard } from "@/app/(portal)/portal/donate/_components/campaign-card";
import { DonorWall } from "@/app/(portal)/portal/donate/_components/donor-wall";
import DonateLoading from "@/app/(portal)/portal/donate/loading";
import { DonationModal } from "@/components/portal/donation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { alumniProfiles, privacySettings } from "@/lib/db/schema";
import {
  formatUgxCompact,
  getDonateImpactStats,
  getDonorWallCurrentMonth,
  listActiveCampaigns,
  pickUrgentCampaignId,
} from "@/lib/donate";
import { eq } from "drizzle-orm";

async function DonateContent({
  userId,
  userName,
  userEmail,
  userEmailVerified,
}: {
  userId: string;
  userName: string | null;
  userEmail: string;
  userEmailVerified: boolean;
}) {
  const [stats, campaigns, donorWall, profileRow] = await Promise.all([
    getDonateImpactStats(),
    listActiveCampaigns(),
    getDonorWallCurrentMonth(),
    db
      .select({
        firstName: alumniProfiles.firstName,
        lastName: alumniProfiles.lastName,
        verificationStatus: alumniProfiles.verificationStatus,
        showOnDonorWall: privacySettings.showOnDonorWall,
      })
      .from(alumniProfiles)
      .leftJoin(privacySettings, eq(privacySettings.userId, alumniProfiles.userId))
      .where(eq(alumniProfiles.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const urgentCampaignId = pickUrgentCampaignId(campaigns);
  const donor = {
    userId,
    name:
      profileRow?.firstName && profileRow?.lastName
        ? `${profileRow.firstName} ${profileRow.lastName}`
        : userName ?? "BICKOSA Member",
    email: userEmail,
    isVerified: userEmailVerified || profileRow?.verificationStatus === "verified",
    showOnDonorWall: profileRow?.showOnDonorWall ?? true,
  };

  const campaignsForPicker = campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    slug: campaign.slug,
  }));

  return (
    <>
      <div className="rounded-[var(--r-xl)] bg-[linear-gradient(120deg,var(--navy-900),var(--navy-700))] p-5 text-[var(--white)] shadow-[var(--shadow-md)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--navy-200)]">Total Raised</p>
              <p className="mt-1 font-[var(--font-ui)] text-2xl font-bold">
                {formatUgxCompact(stats.totalRaised)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--navy-200)]">Total Donors</p>
              <p className="mt-1 font-[var(--font-ui)] text-2xl font-bold">
                {stats.totalDonors.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--navy-200)]">Active Campaigns</p>
              <p className="mt-1 font-[var(--font-ui)] text-2xl font-bold">
                {stats.activeCampaignsCount.toLocaleString()}
              </p>
            </div>
          </div>
          <DonationModal
            campaigns={campaignsForPicker}
            donor={donor}
            triggerVariant="gold"
            triggerLabel="Donate Now"
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
          Active Campaigns
        </h2>
        {campaigns.length === 0 ? (
          <EmptyState
            icon={HandHeart}
            title="No active campaigns"
            body="New giving opportunities will appear here once campaigns are published."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                campaignsForPicker={campaignsForPicker}
                donor={donor}
                isGoldCta={campaign.id === urgentCampaignId}
              />
            ))}
          </div>
        )}
      </section>

      <DonorWall names={donorWall.names} totalCount={donorWall.totalCount} />
    </>
  );
}

export default async function DonatePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <section className="space-y-6">
      <h1 className="font-[var(--font-ui)] text-3xl font-semibold text-[var(--navy-900)]">
        Give Back
      </h1>
      <Suspense fallback={<DonateLoading />}>
        <DonateContent
          userId={session.user.id}
          userName={session.user.name ?? null}
          userEmail={session.user.email}
          userEmailVerified={Boolean(session.user.emailVerified)}
        />
      </Suspense>
    </section>
  );
}
