import { and, asc, count, desc, eq, gt, inArray, or, sql, type SQL } from "drizzle-orm";

import { leadershipCommittee } from "@/config/leadership";
import { db } from "@/lib/db";
import {
  alumniProfiles,
  chapters,
  documents,
  events,
  privacySettings,
  users,
} from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

type DocumentCategory = NonNullable<(typeof documents.$inferSelect)["category"]>;

export type LeaderCardData = {
  alumniProfileId: string;
  fullName: string;
  role: string;
  classYear: number;
  avatarUrl: string | null;
};

export type ChapterOverviewItem = {
  id: string;
  slug: string;
  name: string;
  country: string;
  memberCount: number;
  status: "Active" | "Growing";
};

export type GovernanceDocumentItem = {
  id: string;
  title: string;
  description: string | null;
  fileSize: number;
  year: number | null;
  category: DocumentCategory;
};

export type GovernanceDocumentGroup = {
  label: string;
  category: DocumentCategory;
  items: GovernanceDocumentItem[];
};

export type ChapterRegionFilter = "all" | "uganda" | "uk" | "usa" | "east-africa" | "other";

export type ChapterListItem = {
  id: string;
  slug: string;
  name: string;
  country: string;
  city: string | null;
  leaderName: string | null;
  memberCount: number;
  foundedYear: number | null;
  isActive: boolean;
};

export type ChapterMemberItem = {
  profileId: string;
  fullName: string;
  classYear: number | null;
  jobTitle: string | null;
};

export type ChapterEventItem = {
  id: string;
  slug: string;
  title: string;
  startAt: Date;
  locationName: string | null;
  isOnline: boolean;
};

export type ChapterDetailData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country: string;
  city: string | null;
  foundedYear: number | null;
  memberCount: number;
  leaderName: string | null;
  events: ChapterEventItem[];
  members: ChapterMemberItem[];
};

const categoryDisplayOrder: Array<{ category: DocumentCategory; label: string }> = [
  { category: "constitution", label: "Constitution" },
  { category: "annual_report", label: "Annual Reports" },
  { category: "financial", label: "Financial Summaries" },
  { category: "minutes", label: "AGM Minutes" },
  { category: "policy", label: "Policies" },
];

function isEastAfricanCountry(country: string | null): boolean {
  if (!country) {
    return false;
  }
  return ["uganda", "kenya", "tanzania", "rwanda", "burundi", "south sudan"].includes(
    country.trim().toLowerCase(),
  );
}

function buildChapterRegionWhere(region: ChapterRegionFilter): SQL | undefined {
  if (region === "all") {
    return undefined;
  }
  if (region === "uganda") {
    return eq(sql`lower(${chapters.country})`, "uganda");
  }
  if (region === "uk") {
    return or(eq(sql`lower(${chapters.country})`, "uk"), eq(sql`lower(${chapters.country})`, "united kingdom")) as SQL;
  }
  if (region === "usa") {
    return or(eq(sql`lower(${chapters.country})`, "usa"), eq(sql`lower(${chapters.country})`, "united states")) as SQL;
  }
  if (region === "east-africa") {
    return sql`lower(${chapters.country}) in ('kenya','tanzania','rwanda','burundi','south sudan')`;
  }
  return sql`lower(${chapters.country}) not in ('uganda','uk','united kingdom','usa','united states','kenya','tanzania','rwanda','burundi','south sudan')`;
}

export function normalizeChapterRegion(input: string | null): ChapterRegionFilter {
  if (
    input === "uganda" ||
    input === "uk" ||
    input === "usa" ||
    input === "east-africa" ||
    input === "other"
  ) {
    return input;
  }
  return "all";
}

export async function getExecutiveCommittee(): Promise<LeaderCardData[]> {
  const profileIds = leadershipCommittee.map((member) => member.alumniProfileId);
  const profileRows =
    profileIds.length > 0
      ? await db
          .select({
            id: alumniProfiles.id,
            firstName: alumniProfiles.firstName,
            lastName: alumniProfiles.lastName,
            yearOfCompletion: alumniProfiles.yearOfCompletion,
            avatarKey: alumniProfiles.avatarKey,
          })
          .from(alumniProfiles)
          .where(inArray(alumniProfiles.id, profileIds))
      : [];

  const byId = new Map(profileRows.map((row) => [row.id, row]));

  return leadershipCommittee.map((member) => {
    const profile = byId.get(member.alumniProfileId);
    return {
      alumniProfileId: member.alumniProfileId,
      fullName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : member.name,
      role: member.role,
      classYear: profile?.yearOfCompletion ?? member.classYear,
      avatarUrl: profile?.avatarKey ? buildR2PublicUrl(profile.avatarKey) : null,
    };
  });
}

export async function listChapterOverview(limit = 6): Promise<ChapterOverviewItem[]> {
  const rows = await db
    .select({
      id: chapters.id,
      slug: chapters.slug,
      name: chapters.name,
      country: chapters.country,
      memberCount: chapters.memberCount,
      isActive: chapters.isActive,
    })
    .from(chapters)
    .orderBy(desc(chapters.memberCount), asc(chapters.name))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    country: row.country,
    memberCount: row.memberCount,
    status: row.isActive ? "Active" : "Growing",
  }));
}

export async function listGovernanceDocuments(params: {
  includePrivate: boolean;
}): Promise<GovernanceDocumentGroup[]> {
  const where: SQL[] = [
    inArray(
      documents.category,
      categoryDisplayOrder.map((item) => item.category),
    ),
  ];

  if (!params.includePrivate) {
    where.push(eq(documents.isPublic, true));
  }

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      description: documents.description,
      fileSize: documents.fileSize,
      year: documents.year,
      category: documents.category,
      isPublic: documents.isPublic,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(...where) as SQL)
    .orderBy(desc(documents.year), desc(documents.createdAt));

  const grouped = new Map<DocumentCategory, GovernanceDocumentItem[]>();
  for (const row of rows) {
    const existing = grouped.get(row.category) ?? [];
    existing.push({
      id: row.id,
      title: row.title,
      description: row.description,
      fileSize: row.fileSize,
      year: row.year,
      category: row.category,
    });
    grouped.set(row.category, existing);
  }

  return categoryDisplayOrder.map((item) => ({
    category: item.category,
    label: item.label,
    items: grouped.get(item.category) ?? [],
  }));
}

export async function listChapters(params: { region: ChapterRegionFilter }): Promise<ChapterListItem[]> {
  const where = buildChapterRegionWhere(params.region);

  const rows = await db
    .select({
      id: chapters.id,
      slug: chapters.slug,
      name: chapters.name,
      country: chapters.country,
      city: chapters.city,
      memberCount: chapters.memberCount,
      foundedYear: chapters.foundedYear,
      isActive: chapters.isActive,
      leaderName: users.name,
    })
    .from(chapters)
    .leftJoin(users, eq(users.id, chapters.leaderId))
    .where(where)
    .orderBy(desc(chapters.memberCount), asc(chapters.name));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    country: row.country,
    city: row.city,
    leaderName: row.leaderName,
    memberCount: row.memberCount,
    foundedYear: row.foundedYear,
    isActive: row.isActive,
  }));
}

export async function getViewerChapterId(userId: string): Promise<string | null> {
  const profile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, userId),
    columns: { chapterId: true },
  });

  return profile?.chapterId ?? null;
}

export async function getChapterBySlug(slug: string): Promise<ChapterDetailData | null> {
  const [chapterRow] = await db
    .select({
      id: chapters.id,
      name: chapters.name,
      slug: chapters.slug,
      description: chapters.description,
      country: chapters.country,
      city: chapters.city,
      foundedYear: chapters.foundedYear,
      memberCount: chapters.memberCount,
      leaderName: users.name,
    })
    .from(chapters)
    .leftJoin(users, eq(users.id, chapters.leaderId))
    .where(eq(chapters.slug, slug))
    .limit(1);

  if (!chapterRow) {
    return null;
  }

  const now = new Date();
  const [eventRows, memberRows] = await Promise.all([
    db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        startAt: events.startAt,
        locationName: events.locationName,
        isOnline: events.isOnline,
      })
      .from(events)
      .where(and(eq(events.chapterId, chapterRow.id), eq(events.isPublished, true), gt(events.startAt, now)))
      .orderBy(asc(events.startAt))
      .limit(6),
    db
      .select({
        profileId: alumniProfiles.id,
        firstName: alumniProfiles.firstName,
        lastName: alumniProfiles.lastName,
        classYear: alumniProfiles.yearOfCompletion,
        jobTitle: alumniProfiles.currentJobTitle,
        showInDirectory: privacySettings.showInDirectory,
      })
      .from(alumniProfiles)
      .leftJoin(privacySettings, eq(privacySettings.userId, alumniProfiles.userId))
      .where(and(eq(alumniProfiles.chapterId, chapterRow.id), or(eq(privacySettings.showInDirectory, true), sql`${privacySettings.id} is null`) as SQL))
      .orderBy(asc(alumniProfiles.firstName), asc(alumniProfiles.lastName))
      .limit(40),
  ]);

  return {
    id: chapterRow.id,
    name: chapterRow.name,
    slug: chapterRow.slug,
    description: chapterRow.description,
    country: chapterRow.country,
    city: chapterRow.city,
    foundedYear: chapterRow.foundedYear,
    memberCount: chapterRow.memberCount,
    leaderName: chapterRow.leaderName,
    events: eventRows,
    members: memberRows.map((row) => ({
      profileId: row.profileId,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      classYear: row.classYear,
      jobTitle: row.jobTitle,
    })),
  };
}

export function getCountryFlagEmoji(country: string): string {
  const key = country.trim().toLowerCase();
  if (key === "uganda") return "🇺🇬";
  if (key === "uk" || key === "united kingdom") return "🇬🇧";
  if (key === "usa" || key === "united states") return "🇺🇸";
  if (key === "kenya") return "🇰🇪";
  if (key === "tanzania") return "🇹🇿";
  if (key === "rwanda") return "🇷🇼";
  if (key === "burundi") return "🇧🇮";
  if (key === "south sudan") return "🇸🇸";
  return "🌍";
}

export async function getChapterCountByRegion(): Promise<Record<Exclude<ChapterRegionFilter, "all">, number>> {
  const rows = await db
    .select({
      country: chapters.country,
      value: count(),
    })
    .from(chapters)
    .groupBy(chapters.country);

  const counts: Record<Exclude<ChapterRegionFilter, "all">, number> = {
    uganda: 0,
    uk: 0,
    usa: 0,
    "east-africa": 0,
    other: 0,
  };

  for (const row of rows) {
    const country = row.country?.trim().toLowerCase() ?? "";
    if (country === "uganda") {
      counts.uganda += row.value;
      continue;
    }
    if (country === "uk" || country === "united kingdom") {
      counts.uk += row.value;
      continue;
    }
    if (country === "usa" || country === "united states") {
      counts.usa += row.value;
      continue;
    }
    if (isEastAfricanCountry(row.country)) {
      counts["east-africa"] += row.value;
      continue;
    }
    counts.other += row.value;
  }

  return counts;
}
