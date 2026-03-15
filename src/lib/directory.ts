import {
  and,
  asc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  chapters,
  privacySettings,
  users,
} from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

const MAX_SEARCH_LENGTH = 80;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

const SPECIAL_COUNTRY_OTHER = "Other";
const COMMON_COUNTRIES = ["Uganda", "UK", "USA", "Kenya"] as const;

export type DirectorySearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export type DirectoryQuery = {
  search: string;
  yearFrom: number | null;
  yearTo: number | null;
  country: string | null;
  industry: string | null;
  chapter: string | null;
  page: number;
  limit: number;
};

export type DirectoryChapterOption = {
  id: string;
  name: string;
};

export type DirectoryAlumnus = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  currentJobTitle: string | null;
  currentEmployer: string | null;
  classYear: number | null;
  locationCity: string | null;
  locationCountry: string | null;
  chapterName: string | null;
  industry: string | null;
  email: string | null;
  isAvailableForMentorship: boolean;
};

export type DirectoryProfileDetail = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  classYear: number | null;
  bio: string | null;
  industry: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  linkedinUrl: string | null;
  chapterName: string | null;
  currentJobTitle: string | null;
  currentEmployer: string | null;
  email: string | null;
  phone: string | null;
  isAvailableForMentorship: boolean;
};

type ListDirectoryAlumniParams = {
  viewerIsVerified: boolean;
  query: DirectoryQuery;
};

function getValue(input: DirectorySearchParamsInput, key: string): string | null {
  if (input instanceof URLSearchParams) {
    return input.get(key);
  }

  const raw = input[key];
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }

  return raw ?? null;
}

function toNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = toNumber(value);
  if (!parsed || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function normalizeDirectoryQuery(input: DirectorySearchParamsInput): DirectoryQuery {
  const search = (getValue(input, "search") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  const yearFrom = toNumber(getValue(input, "yearFrom"));
  const yearTo = toNumber(getValue(input, "yearTo"));
  const country = (getValue(input, "country") ?? "").trim() || null;
  const industry = (getValue(input, "industry") ?? "").trim() || null;
  const chapter = (getValue(input, "chapter") ?? "").trim() || null;
  const page = toPositiveInt(getValue(input, "page"), DEFAULT_PAGE);
  const requestedLimit = toPositiveInt(getValue(input, "limit"), DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, requestedLimit);

  return {
    search,
    yearFrom,
    yearTo,
    country,
    industry,
    chapter,
    page,
    limit,
  };
}

function buildDirectoryWhereClause(query: DirectoryQuery): SQL {
  const whereClauses: SQL[] = [
    or(eq(privacySettings.showInDirectory, true), isNull(privacySettings.id)) as SQL,
  ];

  if (query.search) {
    const searchTerm = `%${query.search}%`;
    whereClauses.push(
      or(
        ilike(alumniProfiles.firstName, searchTerm),
        ilike(alumniProfiles.lastName, searchTerm),
        ilike(alumniProfiles.currentEmployer, searchTerm),
        ilike(alumniProfiles.locationCity, searchTerm),
      ) as SQL,
    );
  }

  if (query.yearFrom !== null) {
    whereClauses.push(gte(alumniProfiles.yearOfCompletion, query.yearFrom));
  }

  if (query.yearTo !== null) {
    whereClauses.push(lte(alumniProfiles.yearOfCompletion, query.yearTo));
  }

  if (query.country === SPECIAL_COUNTRY_OTHER) {
    whereClauses.push(
      sql`${alumniProfiles.locationCountry} is not null and ${alumniProfiles.locationCountry} not in (${sql.join(
        COMMON_COUNTRIES.map((country) => sql`${country}`),
        sql`, `,
      )})`,
    );
  } else if (query.country) {
    whereClauses.push(eq(alumniProfiles.locationCountry, query.country));
  }

  if (query.industry) {
    whereClauses.push(eq(alumniProfiles.industry, query.industry));
  }

  if (query.chapter) {
    whereClauses.push(eq(alumniProfiles.chapterId, query.chapter));
  }

  return and(...whereClauses) as SQL;
}

export async function getDirectoryChapters(): Promise<DirectoryChapterOption[]> {
  const rows = await db
    .select({
      id: chapters.id,
      name: chapters.name,
    })
    .from(chapters)
    .where(eq(chapters.isActive, true))
    .orderBy(asc(chapters.name));

  return rows;
}

export async function getViewerIsVerified(viewerUserId: string, emailVerified: boolean): Promise<boolean> {
  if (emailVerified) {
    return true;
  }

  const profile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, viewerUserId),
    columns: {
      verificationStatus: true,
    },
  });

  return profile?.verificationStatus === "verified";
}

export async function listDirectoryAlumni({
  viewerIsVerified,
  query,
}: ListDirectoryAlumniParams): Promise<{ total: number; alumni: DirectoryAlumnus[] }> {
  const where = buildDirectoryWhereClause(query);
  const offset = (query.page - 1) * query.limit;

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(alumniProfiles)
    .leftJoin(privacySettings, eq(privacySettings.userId, alumniProfiles.userId))
    .where(where);

  const rows = await db
    .select({
      id: alumniProfiles.id,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      yearOfCompletion: alumniProfiles.yearOfCompletion,
      currentJobTitle: alumniProfiles.currentJobTitle,
      currentEmployer: alumniProfiles.currentEmployer,
      industry: alumniProfiles.industry,
      locationCity: alumniProfiles.locationCity,
      locationCountry: alumniProfiles.locationCountry,
      avatarKey: alumniProfiles.avatarKey,
      isAvailableForMentorship: alumniProfiles.isAvailableForMentorship,
      chapterName: chapters.name,
      email: users.email,
      showEmail: privacySettings.showEmail,
      showEmployer: privacySettings.showEmployer,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .leftJoin(chapters, eq(chapters.id, alumniProfiles.chapterId))
    .leftJoin(privacySettings, eq(privacySettings.userId, alumniProfiles.userId))
    .where(where)
    .orderBy(asc(alumniProfiles.firstName), asc(alumniProfiles.lastName))
    .limit(query.limit)
    .offset(offset);

  return {
    total: countRow?.value ?? 0,
    alumni: rows.map((row) => {
      const showEmployer = row.showEmployer ?? true;
      const showEmail = viewerIsVerified && (row.showEmail ?? false);

      return {
        id: row.id,
        fullName: `${row.firstName} ${row.lastName}`.trim(),
        avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
        currentJobTitle: row.currentJobTitle,
        currentEmployer: showEmployer ? row.currentEmployer : null,
        classYear: row.yearOfCompletion,
        locationCity: row.locationCity,
        locationCountry: row.locationCountry,
        chapterName: row.chapterName,
        industry: row.industry,
        email: showEmail ? row.email : null,
        isAvailableForMentorship: row.isAvailableForMentorship,
      };
    }),
  };
}

export async function getDirectoryProfileById(params: {
  profileId: string;
  viewerIsVerified: boolean;
}): Promise<DirectoryProfileDetail | null> {
  const [row] = await db
    .select({
      id: alumniProfiles.id,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      yearOfCompletion: alumniProfiles.yearOfCompletion,
      bio: alumniProfiles.bio,
      industry: alumniProfiles.industry,
      locationCity: alumniProfiles.locationCity,
      locationCountry: alumniProfiles.locationCountry,
      linkedinUrl: alumniProfiles.linkedinUrl,
      chapterName: chapters.name,
      currentJobTitle: alumniProfiles.currentJobTitle,
      currentEmployer: alumniProfiles.currentEmployer,
      phone: alumniProfiles.phone,
      avatarKey: alumniProfiles.avatarKey,
      email: users.email,
      showInDirectory: privacySettings.showInDirectory,
      showEmail: privacySettings.showEmail,
      showPhone: privacySettings.showPhone,
      showEmployer: privacySettings.showEmployer,
      isAvailableForMentorship: alumniProfiles.isAvailableForMentorship,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .leftJoin(chapters, eq(chapters.id, alumniProfiles.chapterId))
    .leftJoin(privacySettings, eq(privacySettings.userId, alumniProfiles.userId))
    .where(eq(alumniProfiles.id, params.profileId))
    .limit(1);

  if (!row) {
    return null;
  }

  const showInDirectory = row.showInDirectory ?? true;
  if (!showInDirectory) {
    return null;
  }

  const showEmployer = row.showEmployer ?? true;
  const showEmail = params.viewerIsVerified && (row.showEmail ?? false);
  const showPhone = row.showPhone ?? false;

  return {
    id: row.id,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
    classYear: row.yearOfCompletion,
    bio: row.bio,
    industry: row.industry,
    locationCity: row.locationCity,
    locationCountry: row.locationCountry,
    linkedinUrl: row.linkedinUrl,
    chapterName: row.chapterName,
    currentJobTitle: row.currentJobTitle,
    currentEmployer: showEmployer ? row.currentEmployer : null,
    email: showEmail ? row.email : null,
    phone: showPhone ? row.phone : null,
    isAvailableForMentorship: row.isAvailableForMentorship,
  };
}
