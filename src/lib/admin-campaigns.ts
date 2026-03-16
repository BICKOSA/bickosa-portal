import { and, asc, count, desc, eq, ilike, ne, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { campaigns, donations } from "@/lib/db/schema";
import { buildR2PublicUrl, uploadBufferToR2 } from "@/lib/r2";

export type CampaignProjectType =
  | "academic_block"
  | "ict_lab"
  | "scholarship"
  | "sports"
  | "general";

export type AdminCampaignRow = {
  id: string;
  title: string;
  slug: string;
  projectType: CampaignProjectType;
  raisedAmount: bigint;
  goalAmount: bigint;
  fundedPercent: number;
  donorCount: number;
  isActive: boolean;
  isPublished: boolean;
  isFeatured: boolean;
};

export type AdminCampaignListQuery = {
  search: string;
  page: number;
  pageSize: number;
};

export type AdminCampaignListResult = {
  items: AdminCampaignRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminCampaignDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  projectType: CampaignProjectType;
  goalAmount: bigint;
  raisedAmount: bigint;
  currency: string;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  bannerKey: string | null;
  bannerUrl: string | null;
  bannerColor: string | null;
  isFeatured: boolean;
  isPublished: boolean;
};

const campaignInputSchema = z
  .object({
    title: z.string().trim().min(1),
    slug: z
      .string()
      .trim()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().trim().nullable(),
    projectType: z.enum(["academic_block", "ict_lab", "scholarship", "sports", "general"]),
    goalAmount: z.coerce.bigint().refine((value) => value > BigInt(0), {
      message: "Goal amount must be greater than zero.",
    }),
    currency: z.string().trim().min(1).max(8),
    startDate: z.coerce.date().nullable(),
    endDate: z.coerce.date().nullable(),
    isActive: z.boolean(),
    bannerColor: z.string().trim().nullable(),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
  })
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date must be after start date.",
  });

export type AdminCampaignInput = z.infer<typeof campaignInputSchema>;

const campaignListQuerySchema = z.object({
  search: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export function normalizeCampaignSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeAdminCampaignListQuery(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): AdminCampaignListQuery {
  function get(key: string): string | undefined {
    if (input instanceof URLSearchParams) {
      return input.get(key) ?? undefined;
    }
    const value = input[key];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  return campaignListQuerySchema.parse({
    search: get("search"),
    page: get("page"),
    pageSize: get("pageSize"),
  });
}

function parseBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return typeof value === "string" && (value === "true" || value === "1" || value === "on");
}

function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseCampaignFormInput(formData: FormData): AdminCampaignInput {
  const title = getString(formData, "title") ?? "";
  const slug = normalizeCampaignSlug(getString(formData, "slug") ?? title);

  return campaignInputSchema.parse({
    title,
    slug,
    description: getString(formData, "description"),
    projectType: getString(formData, "projectType") ?? "general",
    goalAmount: getString(formData, "goalAmount") ?? "0",
    currency: getString(formData, "currency") ?? "UGX",
    startDate: parseDate(getString(formData, "startDate")),
    endDate: parseDate(getString(formData, "endDate")),
    isActive: parseBoolean(formData, "isActive"),
    bannerColor: getString(formData, "bannerColor"),
    isFeatured: parseBoolean(formData, "isFeatured"),
    isPublished: parseBoolean(formData, "isPublished"),
  });
}

export async function maybeUploadCampaignBanner(params: {
  file: File | null;
  userId: string;
}): Promise<string | null> {
  if (!params.file || params.file.size === 0) {
    return null;
  }

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(params.file.type)) {
    throw new Error("Banner must be JPG, PNG, or WEBP.");
  }

  if (params.file.size > 10 * 1024 * 1024) {
    throw new Error("Banner image must be 10MB or less.");
  }

  const extension =
    params.file.type === "image/png"
      ? "png"
      : params.file.type === "image/webp"
        ? "webp"
        : "jpg";
  const key = `campaigns/${params.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const uploaded = await uploadBufferToR2({
    key,
    body: new Uint8Array(await params.file.arrayBuffer()),
    contentType: params.file.type,
  });

  return uploaded.key;
}

export async function isCampaignSlugAvailable(params: {
  slug: string;
  excludeId?: string | null;
}): Promise<boolean> {
  const normalized = normalizeCampaignSlug(params.slug);
  if (!normalized) {
    return false;
  }

  const existing = await db.query.campaigns.findFirst({
    where:
      params.excludeId && params.excludeId.length > 0
        ? and(eq(campaigns.slug, normalized), ne(campaigns.id, params.excludeId))
        : eq(campaigns.slug, normalized),
    columns: {
      id: true,
    },
  });
  return !existing;
}

function buildWhere(search: string): SQL | undefined {
  if (!search.trim()) {
    return undefined;
  }
  const term = `%${search.trim()}%`;
  return ilike(campaigns.title, term);
}

export async function listAdminCampaigns(query: AdminCampaignListQuery): Promise<AdminCampaignListResult> {
  const where = buildWhere(query.search);
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

  const baseQuery = db
    .with(donorCounts)
    .select({
      id: campaigns.id,
      title: campaigns.title,
      slug: campaigns.slug,
      projectType: campaigns.projectType,
      raisedAmount: campaigns.raisedAmount,
      goalAmount: campaigns.goalAmount,
      donorCount: sql<number>`coalesce(${donorCounts.donorCount}, 0)::int`,
      isActive: campaigns.isActive,
      isPublished: campaigns.isPublished,
      isFeatured: campaigns.isFeatured,
    })
    .from(campaigns)
    .leftJoin(donorCounts, eq(donorCounts.campaignId, campaigns.id))
    .where(where);

  const [rows, totalRows] = await Promise.all([
    baseQuery
      .orderBy(desc(campaigns.isFeatured), desc(campaigns.updatedAt), asc(campaigns.title))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ value: count() }).from(campaigns).where(where),
  ]);

  const items = rows.map((row) => {
    const goal = Number(row.goalAmount);
    const raised = Number(row.raisedAmount);
    const fundedPercent = goal > 0 ? Math.max(0, Math.min(100, Math.round((raised / goal) * 100))) : 0;

    return {
      ...row,
      fundedPercent,
    };
  });

  const total = totalRows[0]?.value ?? 0;
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getAdminCampaignById(id: string): Promise<AdminCampaignDetail | null> {
  const [row] = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      slug: campaigns.slug,
      description: campaigns.description,
      projectType: campaigns.projectType,
      goalAmount: campaigns.goalAmount,
      raisedAmount: campaigns.raisedAmount,
      currency: campaigns.currency,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      isActive: campaigns.isActive,
      bannerKey: campaigns.bannerKey,
      bannerColor: campaigns.bannerColor,
      isFeatured: campaigns.isFeatured,
      isPublished: campaigns.isPublished,
    })
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    bannerUrl: row.bannerKey ? buildR2PublicUrl(row.bannerKey) : null,
  };
}
