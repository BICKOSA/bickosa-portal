import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  campaignUpdates,
  campaigns,
  donations,
  privacySettings,
  users,
} from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

type PaymentMethod = "mtn_momo" | "airtel_money" | "visa" | "mastercard" | "bank_transfer" | "other";
type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type CampaignSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  bannerColor: string | null;
  goalAmount: bigint;
  raisedAmount: bigint;
  donorCount: number;
  progressPercent: number;
  isFeatured: boolean;
  isPublished: boolean;
  isActive: boolean;
  endDate: Date | null;
};

export type DonateImpactStats = {
  totalRaised: bigint;
  totalDonors: number;
  activeCampaignsCount: number;
};

export type DonorWallData = {
  names: string[];
  totalCount: number;
};

export type RecentDonationItem = {
  id: string;
  amount: bigint;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  donorName: string;
  isAnonymous: boolean;
};

export type CampaignDetailData = CampaignSummary & {
  projectType:
    | "academic_block"
    | "ict_lab"
    | "scholarship"
    | "sports"
    | "general";
  currency: string;
  startDate: Date | null;
  description: string | null;
  updates: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    authorName: string | null;
  }>;
  recentDonations: RecentDonationItem[];
  daysRemaining: number | null;
};

export function formatUgxCompact(value: bigint): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "UGX 0";
  }
  if (amount >= 1_000_000_000) {
    return `UGX ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `UGX ${(amount / 1_000).toFixed(0)}K`;
  }
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

function getCampaignProgressPercent(raisedAmount: bigint, goalAmount: bigint): number {
  const goal = Number(goalAmount);
  const raised = Number(raisedAmount);
  if (!Number.isFinite(goal) || goal <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((raised / goal) * 100)));
}

export async function getDonateImpactStats(): Promise<DonateImpactStats> {
  const [totalRaisedRow] = await db
    .select({
      totalRaised: sql<bigint>`coalesce(sum(${campaigns.raisedAmount}), 0)::bigint`,
      activeCount: sql<number>`count(*)::int`,
    })
    .from(campaigns)
    .where(and(eq(campaigns.isPublished, true), eq(campaigns.isActive, true)));

  const [totalDonorsRow] = await db
    .select({
      totalDonors: sql<number>`count(distinct coalesce(${donations.userId}::text, ${donations.donorEmail}))::int`,
    })
    .from(donations)
    .where(eq(donations.paymentStatus, "completed"));

  return {
    totalRaised: totalRaisedRow?.totalRaised ?? BigInt(0),
    totalDonors: totalDonorsRow?.totalDonors ?? 0,
    activeCampaignsCount: totalRaisedRow?.activeCount ?? 0,
  };
}

export async function listActiveCampaigns(): Promise<CampaignSummary[]> {
  const donorCounts = db.$with("campaign_donor_counts").as(
    db
      .select({
        campaignId: donations.campaignId,
        donorCount: sql<number>`count(*)::int`,
      })
      .from(donations)
      .where(eq(donations.paymentStatus, "completed"))
      .groupBy(donations.campaignId),
  );

  const rows = await db
    .with(donorCounts)
    .select({
      id: campaigns.id,
      title: campaigns.title,
      slug: campaigns.slug,
      description: campaigns.description,
      bannerKey: campaigns.bannerKey,
      bannerColor: campaigns.bannerColor,
      goalAmount: campaigns.goalAmount,
      raisedAmount: campaigns.raisedAmount,
      donorCount: sql<number>`coalesce(${donorCounts.donorCount}, 0)::int`,
      isFeatured: campaigns.isFeatured,
      isPublished: campaigns.isPublished,
      isActive: campaigns.isActive,
      endDate: campaigns.endDate,
    })
    .from(campaigns)
    .leftJoin(donorCounts, eq(donorCounts.campaignId, campaigns.id))
    .where(and(eq(campaigns.isPublished, true), eq(campaigns.isActive, true)))
    .orderBy(desc(campaigns.isFeatured), desc(campaigns.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    bannerUrl: row.bannerKey ? buildR2PublicUrl(row.bannerKey) : null,
    bannerColor: row.bannerColor,
    goalAmount: row.goalAmount,
    raisedAmount: row.raisedAmount,
    donorCount: row.donorCount,
    progressPercent: getCampaignProgressPercent(row.raisedAmount, row.goalAmount),
    isFeatured: row.isFeatured,
    isPublished: row.isPublished,
    isActive: row.isActive,
    endDate: row.endDate,
  }));
}

export function pickUrgentCampaignId(campaignList: CampaignSummary[]): string | null {
  if (campaignList.length === 0) {
    return null;
  }
  const sorted = [...campaignList].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }
    const aRemaining = Number(a.goalAmount - a.raisedAmount);
    const bRemaining = Number(b.goalAmount - b.raisedAmount);
    if (aRemaining !== bRemaining) {
      return aRemaining - bRemaining;
    }
    if (a.endDate && b.endDate) {
      return a.endDate.getTime() - b.endDate.getTime();
    }
    if (a.endDate) {
      return -1;
    }
    if (b.endDate) {
      return 1;
    }
    return 0;
  });

  return sorted[0]?.id ?? null;
}

export async function getDonorWallCurrentMonth(): Promise<DonorWallData> {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

  const rows = await db
    .select({
      fallbackName: donations.donorName,
      userName: users.name,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
    })
    .from(donations)
    .leftJoin(users, eq(users.id, donations.userId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, donations.userId))
    .leftJoin(privacySettings, eq(privacySettings.userId, donations.userId))
    .where(
      and(
        eq(donations.paymentStatus, "completed"),
        eq(donations.isAnonymous, false),
        or(eq(privacySettings.showOnDonorWall, true), sql`${privacySettings.id} is null`),
        gte(donations.createdAt, startOfMonth),
        lte(donations.createdAt, endOfMonth),
      ),
    )
    .orderBy(desc(donations.createdAt));

  const names = rows
    .map((row) => {
      const fullName =
        row.firstName && row.lastName
          ? `${row.firstName} ${row.lastName}`
          : row.userName ?? row.fallbackName;
      return fullName?.trim() ?? null;
    })
    .filter((name): name is string => Boolean(name));

  const uniqueNames = Array.from(new Set(names));
  return {
    names: uniqueNames.slice(0, 16),
    totalCount: uniqueNames.length,
  };
}

export async function getCampaignBySlug(slug: string): Promise<CampaignDetailData | null> {
  const donorCounts = db.$with("campaign_donor_counts").as(
    db
      .select({
        campaignId: donations.campaignId,
        donorCount: sql<number>`count(*)::int`,
      })
      .from(donations)
      .where(eq(donations.paymentStatus, "completed"))
      .groupBy(donations.campaignId),
  );

  const [campaign] = await db
    .with(donorCounts)
    .select({
      id: campaigns.id,
      title: campaigns.title,
      slug: campaigns.slug,
      description: campaigns.description,
      bannerKey: campaigns.bannerKey,
      bannerColor: campaigns.bannerColor,
      goalAmount: campaigns.goalAmount,
      raisedAmount: campaigns.raisedAmount,
      donorCount: sql<number>`coalesce(${donorCounts.donorCount}, 0)::int`,
      isFeatured: campaigns.isFeatured,
      isPublished: campaigns.isPublished,
      isActive: campaigns.isActive,
      endDate: campaigns.endDate,
      startDate: campaigns.startDate,
      projectType: campaigns.projectType,
      currency: campaigns.currency,
    })
    .from(campaigns)
    .leftJoin(donorCounts, eq(donorCounts.campaignId, campaigns.id))
    .where(and(eq(campaigns.slug, slug), eq(campaigns.isPublished, true)))
    .limit(1);

  if (!campaign) {
    return null;
  }

  const recentDonationsRows = await db
    .select({
      id: donations.id,
      amount: donations.amount,
      paymentMethod: donations.paymentMethod,
      createdAt: donations.createdAt,
      isAnonymous: donations.isAnonymous,
      donorName: donations.donorName,
      userName: users.name,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
    })
    .from(donations)
    .leftJoin(users, eq(users.id, donations.userId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, donations.userId))
    .where(and(eq(donations.campaignId, campaign.id), eq(donations.paymentStatus, "completed")))
    .orderBy(desc(donations.createdAt))
    .limit(20);

  const recentDonations: RecentDonationItem[] = recentDonationsRows.map((row) => {
    const fullName =
      row.firstName && row.lastName
        ? `${row.firstName} ${row.lastName}`
        : row.userName ?? row.donorName ?? "Anonymous";
    return {
      id: row.id,
      amount: row.amount,
      paymentMethod: row.paymentMethod,
      createdAt: row.createdAt,
      donorName: row.isAnonymous ? "Anonymous donor" : fullName,
      isAnonymous: row.isAnonymous,
    };
  });

  const daysRemaining =
    campaign.endDate === null
      ? null
      : Math.max(0, Math.ceil((campaign.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  const updatesRows = await db
    .select({
      id: campaignUpdates.id,
      title: campaignUpdates.title,
      body: campaignUpdates.body,
      createdAt: campaignUpdates.createdAt,
      updatedAt: campaignUpdates.updatedAt,
      authorName: users.name,
    })
    .from(campaignUpdates)
    .leftJoin(users, eq(users.id, campaignUpdates.authorId))
    .where(eq(campaignUpdates.campaignId, campaign.id))
    .orderBy(desc(campaignUpdates.createdAt))
    .limit(30);

  return {
    id: campaign.id,
    title: campaign.title,
    slug: campaign.slug,
    description: campaign.description,
    bannerUrl: campaign.bannerKey ? buildR2PublicUrl(campaign.bannerKey) : null,
    bannerColor: campaign.bannerColor,
    goalAmount: campaign.goalAmount,
    raisedAmount: campaign.raisedAmount,
    donorCount: campaign.donorCount,
    progressPercent: getCampaignProgressPercent(campaign.raisedAmount, campaign.goalAmount),
    isFeatured: campaign.isFeatured,
    isPublished: campaign.isPublished,
    isActive: campaign.isActive,
    endDate: campaign.endDate,
    startDate: campaign.startDate,
    projectType: campaign.projectType,
    currency: campaign.currency,
    updates: updatesRows,
    recentDonations,
    daysRemaining,
  };
}

export async function getDonationByReferenceId(donationId: string) {
  return db.query.donations.findFirst({
    where: eq(donations.id, donationId),
  });
}

export function isCompletedStatus(status: PaymentStatus): boolean {
  return status === "completed";
}

export async function searchCampaignsForDonationPicker(search: string) {
  const query = search.trim();
  return db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      slug: campaigns.slug,
    })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.isPublished, true),
        eq(campaigns.isActive, true),
        query ? ilike(campaigns.title, `%${query}%`) : sql`true`,
      ),
    )
    .orderBy(desc(campaigns.isFeatured), desc(campaigns.updatedAt))
    .limit(30);
}
