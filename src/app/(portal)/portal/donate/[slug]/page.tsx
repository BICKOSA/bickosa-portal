import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CampaignUpdatesPanel } from "@/app/(portal)/portal/donate/[slug]/_components/campaign-updates-panel";
import { DonationModal } from "@/components/portal/donation-modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { auth } from "@/lib/auth/auth";
import { isAdminUserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { alumniProfiles, privacySettings } from "@/lib/db/schema";
import { formatUgxCompact, getCampaignBySlug, listActiveCampaigns } from "@/lib/donate";

type CampaignDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const [campaign, campaignsForPicker, profileRow] = await Promise.all([
    getCampaignBySlug(slug),
    listActiveCampaigns(),
    db
      .select({
        firstName: alumniProfiles.firstName,
        lastName: alumniProfiles.lastName,
        verificationStatus: alumniProfiles.verificationStatus,
        showOnDonorWall: privacySettings.showOnDonorWall,
      })
      .from(alumniProfiles)
      .leftJoin(privacySettings, eq(privacySettings.userId, alumniProfiles.userId))
      .where(eq(alumniProfiles.userId, session.user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!campaign) {
    notFound();
  }

  const donor = {
    userId: session.user.id,
    name:
      profileRow?.firstName && profileRow?.lastName
        ? `${profileRow.firstName} ${profileRow.lastName}`
        : session.user.name ?? "BICKOSA Member",
    email: session.user.email,
    isVerified:
      Boolean(session.user.emailVerified) || profileRow?.verificationStatus === "verified",
    showOnDonorWall: profileRow?.showOnDonorWall ?? true,
  };
  const canPostUpdates = isAdminUserRole((session.user as { role?: string }).role);
  const pickerCampaigns = campaignsForPicker.some((item) => item.id === campaign.id)
    ? campaignsForPicker
    : [
        ...campaignsForPicker,
        {
          id: campaign.id,
          title: campaign.title,
          slug: campaign.slug,
          description: campaign.description,
          bannerUrl: campaign.bannerUrl,
          bannerColor: campaign.bannerColor,
          goalAmount: campaign.goalAmount,
          raisedAmount: campaign.raisedAmount,
          donorCount: campaign.donorCount,
          progressPercent: campaign.progressPercent,
          isFeatured: campaign.isFeatured,
          isPublished: campaign.isPublished,
          isActive: campaign.isActive,
          endDate: campaign.endDate,
        },
      ];

  return (
    <section className="space-y-5">
      <div
        className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-cover bg-center shadow-[var(--shadow-md)]"
        style={{
          backgroundImage: campaign.bannerUrl
            ? `linear-gradient(180deg, rgba(13,27,62,0.28), rgba(13,27,62,0.8)), url(${campaign.bannerUrl})`
            : `linear-gradient(120deg, ${campaign.bannerColor ?? "#1a3060"}, #0d1b3e)`,
        }}
      >
        <div className="p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--navy-200)]">Fundraising Campaign</p>
          <h1 className="mt-2 max-w-3xl font-[var(--font-ui)] text-3xl font-bold text-[var(--white)] sm:text-4xl">
            {campaign.title}
          </h1>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
            <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">About this campaign</h2>
            <div className="prose prose-sm mt-3 max-w-none text-[var(--text-2)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {campaign.description ?? "Campaign details are being prepared."}
              </ReactMarkdown>
            </div>
          </section>

          <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
            <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Recent donations</h2>
            {campaign.recentDonations.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-2)]">No donations recorded yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {campaign.recentDonations.map((donation) => (
                  <li
                    key={donation.id}
                    className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-1)]">{donation.donorName}</p>
                      <p className="text-xs text-[var(--text-3)]">
                        {DATE_FORMATTER.format(donation.createdAt)} · {donation.paymentMethod.replace("_", " ")}
                      </p>
                    </div>
                    <p className="font-[var(--font-ui)] text-sm font-semibold text-[var(--navy-900)]">
                      {formatUgxCompact(donation.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
            <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">
              Campaign updates
            </h2>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Updates from campaign administrators will appear here as progress milestones are posted.
            </p>
            <div className="mt-3">
              <CampaignUpdatesPanel
                campaignId={campaign.id}
                canManage={canPostUpdates}
                initialUpdates={campaign.updates}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
            <h3 className="font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">Progress</h3>
            <p className="mt-3 font-[var(--font-ui)] text-3xl font-bold text-[var(--navy-900)]">
              {formatUgxCompact(campaign.raisedAmount)}
            </p>
            <ProgressBar className="mt-3 h-3" value={campaign.progressPercent} />
            <div className="mt-3 space-y-1 text-sm text-[var(--text-2)]">
              <p>Goal: {formatUgxCompact(campaign.goalAmount)}</p>
              <p>Donors: {campaign.donorCount.toLocaleString()}</p>
              <p>Days remaining: {campaign.daysRemaining === null ? "Open-ended" : campaign.daysRemaining}</p>
            </div>
          </section>

          <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
            <h3 className="font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">
              Donate to this Campaign
            </h3>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Every contribution directly supports this campaign&apos;s objectives.
            </p>
            <div className="mt-4">
              <DonationModal
                campaigns={pickerCampaigns.map((item) => ({
                  id: item.id,
                  title: item.title,
                  slug: item.slug,
                }))}
                defaultCampaignSlug={campaign.slug}
                donor={donor}
                triggerVariant="gold"
                triggerLabel="Donate Now"
              />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
