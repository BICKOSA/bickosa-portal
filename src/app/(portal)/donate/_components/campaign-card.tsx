import Link from "next/link";

import { DonationModal } from "@/components/portal/donation-modal";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { CampaignSummary } from "@/lib/donate";
import { formatUgxCompact } from "@/lib/donate";

type CampaignCardProps = {
  campaign: CampaignSummary;
  isGoldCta: boolean;
  campaignsForPicker: Array<{ id: string; title: string; slug: string }>;
  donor: {
    userId: string;
    name: string;
    email: string;
    isVerified: boolean;
    showOnDonorWall: boolean;
  };
};

export function CampaignCard({ campaign, isGoldCta, campaignsForPicker, donor }: CampaignCardProps) {
  return (
    <article className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
      <div
        className="relative h-[110px] bg-cover bg-center"
        style={{
          backgroundImage: campaign.bannerUrl
            ? `linear-gradient(135deg, rgba(13,27,62,0.2), rgba(13,27,62,0.8)), url(${campaign.bannerUrl})`
            : `linear-gradient(135deg, ${campaign.bannerColor ?? "#1a3060"}, #0d1b3e)`,
        }}
      >
        <div className="absolute right-3 bottom-3">
          <Badge variant="gold">{campaign.progressPercent}% funded</Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-[var(--font-ui)] text-lg font-semibold text-[var(--navy-900)]">
            <Link href={`/portal/donate/${campaign.slug}`} className="hover:text-[var(--navy-700)]">
              {campaign.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--text-2)]">
            {campaign.description ?? "Campaign details will be shared soon."}
          </p>
        </div>

        <p className="font-[var(--font-ui)] text-2xl font-bold text-[var(--navy-900)]">
          {formatUgxCompact(campaign.raisedAmount)}
        </p>

        <ProgressBar value={campaign.progressPercent} className="h-2" />

        <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
          <span>Goal {formatUgxCompact(campaign.goalAmount)}</span>
          <span>{campaign.donorCount.toLocaleString()} donors</span>
        </div>

        <div className="pt-1">
          <DonationModal
            campaigns={campaignsForPicker}
            defaultCampaignSlug={campaign.slug}
            donor={donor}
            triggerLabel="Donate Now"
            triggerVariant={isGoldCta ? "gold" : "navy"}
          />
        </div>
      </div>
    </article>
  );
}
