import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { campaigns, donations, users } from "@/lib/db/schema";

export type AdminDonationFilter = {
  campaignId: string | null;
  status: "all" | "pending" | "completed" | "failed" | "refunded";
  preset: "none" | "this_month" | "last_quarter" | "fiscal_year";
  from: Date | null;
  to: Date | null;
  page: number;
  pageSize: number;
};

export type AdminDonationRow = {
  id: string;
  date: Date;
  donorName: string | null;
  isAnonymous: boolean;
  campaignId: string;
  campaignTitle: string;
  amount: bigint;
  currency: string;
  paymentMethod: "mtn_momo" | "airtel_money" | "visa" | "mastercard" | "bank_transfer" | "other";
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  receiptSentAt: Date | null;
};

export type AdminDonationListResult = {
  items: AdminDonationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function toEndOfDay(input: Date): Date {
  const value = new Date(input);
  value.setHours(23, 59, 59, 999);
  return value;
}

function computePresetRange(
  preset: "none" | "this_month" | "last_quarter" | "fiscal_year",
): { from: Date | null; to: Date | null } {
  if (preset === "none") {
    return { from: null, to: null };
  }

  const now = new Date();
  if (preset === "this_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: now,
    };
  }

  if (preset === "last_quarter") {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const lastQuarter = (currentQuarter + 3) % 4;
    const yearOffset = currentQuarter === 0 ? -1 : 0;
    const year = now.getFullYear() + yearOffset;
    const startMonth = lastQuarter * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
    return {
      from: start,
      to: end,
    };
  }

  const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    from: new Date(fyStartYear, 6, 1),
    to: now,
  };
}

export function normalizeDonationFilter(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): AdminDonationFilter {
  function get(key: string): string | null {
    if (input instanceof URLSearchParams) {
      return input.get(key);
    }
    const value = input[key];
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return value ?? null;
  }

  const statusRaw = get("status");
  const status =
    statusRaw === "pending" || statusRaw === "completed" || statusRaw === "failed" || statusRaw === "refunded"
      ? statusRaw
      : "all";
  const presetRaw = get("preset");
  const preset =
    presetRaw === "this_month" || presetRaw === "last_quarter" || presetRaw === "fiscal_year"
      ? presetRaw
      : "none";

  const campaignId = (get("campaignId") ?? "").trim() || null;
  const fromRaw = get("from") ? new Date(String(get("from"))) : null;
  const toRaw = get("to") ? new Date(String(get("to"))) : null;
  const pageRaw = Number.parseInt(get("page") ?? "1", 10);
  const pageSizeRaw = Number.parseInt(get("pageSize") ?? "15", 10);

  const rangeFromInputs = {
    from: fromRaw && !Number.isNaN(fromRaw.getTime()) ? fromRaw : null,
    to: toRaw && !Number.isNaN(toRaw.getTime()) ? toEndOfDay(toRaw) : null,
  };
  const presetRange = computePresetRange(preset);
  const resolvedRange = preset === "none" ? rangeFromInputs : presetRange;

  return {
    campaignId,
    status,
    preset,
    from: resolvedRange.from,
    to: resolvedRange.to,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    pageSize: Number.isFinite(pageSizeRaw) ? Math.max(1, Math.min(100, pageSizeRaw)) : 15,
  };
}

function buildWhere(filter: AdminDonationFilter): SQL | undefined {
  const conditions: SQL[] = [];

  if (filter.campaignId) {
    conditions.push(eq(donations.campaignId, filter.campaignId));
  }
  if (filter.status !== "all") {
    conditions.push(eq(donations.paymentStatus, filter.status));
  }
  if (filter.from) {
    conditions.push(gte(donations.createdAt, filter.from));
  }
  if (filter.to) {
    conditions.push(lte(donations.createdAt, filter.to));
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions) as SQL;
}

export async function listAdminDonationsPaginated(
  filter: AdminDonationFilter,
): Promise<AdminDonationListResult> {
  const where = buildWhere(filter);
  const [items, totals] = await Promise.all([
    db
      .select({
        id: donations.id,
        date: donations.createdAt,
        donorName: sql<string | null>`coalesce(${users.name}, ${donations.donorName})`,
        isAnonymous: donations.isAnonymous,
        campaignId: donations.campaignId,
        campaignTitle: campaigns.title,
        amount: donations.amount,
        currency: donations.currency,
        paymentMethod: donations.paymentMethod,
        paymentStatus: donations.paymentStatus,
        receiptSentAt: donations.receiptSentAt,
      })
      .from(donations)
      .innerJoin(campaigns, eq(campaigns.id, donations.campaignId))
      .leftJoin(users, eq(users.id, donations.userId))
      .where(where)
      .orderBy(desc(donations.createdAt), asc(campaigns.title))
      .limit(filter.pageSize)
      .offset((filter.page - 1) * filter.pageSize),
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(donations)
      .where(where),
  ]);

  const total = totals[0]?.value ?? 0;
  return {
    items,
    total,
    page: filter.page,
    pageSize: filter.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filter.pageSize)),
  };
}

export async function listAdminDonationsForExport(filter: AdminDonationFilter): Promise<AdminDonationRow[]> {
  const where = buildWhere(filter);
  return db
    .select({
      id: donations.id,
      date: donations.createdAt,
      donorName: sql<string | null>`coalesce(${users.name}, ${donations.donorName})`,
      isAnonymous: donations.isAnonymous,
      campaignId: donations.campaignId,
      campaignTitle: campaigns.title,
      amount: donations.amount,
      currency: donations.currency,
      paymentMethod: donations.paymentMethod,
      paymentStatus: donations.paymentStatus,
      receiptSentAt: donations.receiptSentAt,
    })
    .from(donations)
    .innerJoin(campaigns, eq(campaigns.id, donations.campaignId))
    .leftJoin(users, eq(users.id, donations.userId))
    .where(where)
    .orderBy(desc(donations.createdAt), asc(campaigns.title));
}

export async function listCampaignOptionsForDonations() {
  return db
    .select({
      id: campaigns.id,
      title: campaigns.title,
    })
    .from(campaigns)
    .orderBy(asc(campaigns.title));
}

export function buildDonationsCsv(rows: AdminDonationRow[]): string {
  const header = [
    "Date",
    "Donor",
    "Campaign",
    "Amount",
    "Currency",
    "Payment Method",
    "Status",
    "Receipt Sent",
  ];

  const dataLines = rows.map((row) => {
    const donor = row.isAnonymous ? "Anonymous" : row.donorName ?? "Anonymous";
    const values = [
      row.date.toISOString(),
      donor,
      row.campaignTitle,
      Number(row.amount).toString(),
      row.currency,
      row.paymentMethod,
      row.paymentStatus,
      row.receiptSentAt ? row.receiptSentAt.toISOString() : "",
    ];
    return values
      .map((value) => {
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",");
  });

  return [header.join(","), ...dataLines].join("\n");
}
