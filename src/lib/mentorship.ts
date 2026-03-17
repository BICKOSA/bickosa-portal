import { and, asc, eq, gte, lte, ne, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumniProfiles, mentorshipPreferences, mentorshipRequests, users } from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

export const MENTORSHIP_FOCUS_AREAS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Law",
  "Education",
  "Engineering",
  "Media",
  "Arts",
  "Other",
] as const;

export type MentorshipFocusArea = (typeof MENTORSHIP_FOCUS_AREAS)[number];
export type MentorshipAvailabilityFilter = "all" | "available" | "fully-booked";
export type MentorshipFieldFilter = "all" | MentorshipFocusArea | "law-finance";

export type MentorshipQuery = {
  field: MentorshipFieldFilter;
  availability: MentorshipAvailabilityFilter;
  classYearFrom: number | null;
  classYearTo: number | null;
};

export type MentorListItem = {
  userId: string;
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  classYear: number | null;
  focusAreas: string[];
  pendingRequestCount: number;
  hasPendingRequestFromViewer: boolean;
};

export type MentorRequestHeader = {
  userId: string;
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  classYear: number | null;
  focusAreas: string[];
  pendingRequestCount: number;
  hasPendingRequestFromViewer: boolean;
};

type QueryInput = URLSearchParams | Record<string, string | string[] | undefined>;

function getValue(input: QueryInput, key: string): string | null {
  if (input instanceof URLSearchParams) {
    return input.get(key);
  }

  const value = input[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeMentorshipQuery(input: QueryInput): MentorshipQuery {
  const fieldRaw = (getValue(input, "field") ?? "all").trim();
  const availabilityRaw = (getValue(input, "availability") ?? "all").trim();
  const classYearFrom = toNumber(getValue(input, "classYearFrom"));
  const classYearTo = toNumber(getValue(input, "classYearTo"));

  const field: MentorshipFieldFilter =
    fieldRaw === "law-finance" ||
    fieldRaw === "all" ||
    (MENTORSHIP_FOCUS_AREAS as readonly string[]).includes(fieldRaw)
      ? (fieldRaw as MentorshipFieldFilter)
      : "all";

  const availability: MentorshipAvailabilityFilter =
    availabilityRaw === "available" || availabilityRaw === "fully-booked" ? availabilityRaw : "all";

  return {
    field,
    availability,
    classYearFrom,
    classYearTo,
  };
}

function pendingRequestsSql() {
  return sql<number>`(
    select count(*)::int
    from mentorship_requests mr
    where mr.mentor_id = ${alumniProfiles.userId}
      and mr.status = 'pending'
  )`;
}

function hasPendingRequestFromViewerSql(viewerUserId: string | null) {
  if (!viewerUserId) {
    return sql<boolean>`false`;
  }

  return sql<boolean>`exists(
    select 1
    from mentorship_requests mr
    where mr.mentor_id = ${alumniProfiles.userId}
      and mr.mentee_id = ${viewerUserId}
      and mr.status = 'pending'
  )`;
}

function buildMentorWhereClause(query: MentorshipQuery, excludeUserId?: string): SQL {
  const clauses: SQL[] = [eq(alumniProfiles.isAvailableForMentorship, true)];

  if (excludeUserId) {
    clauses.push(ne(alumniProfiles.userId, excludeUserId));
  }

  if (query.classYearFrom !== null) {
    clauses.push(gte(alumniProfiles.yearOfCompletion, query.classYearFrom));
  }

  if (query.classYearTo !== null) {
    clauses.push(lte(alumniProfiles.yearOfCompletion, query.classYearTo));
  }

  if (query.field === "law-finance") {
    clauses.push(sql`${mentorshipPreferences.focusAreas} && ARRAY['Law', 'Finance']::text[]`);
  } else if (query.field !== "all") {
    clauses.push(sql`${mentorshipPreferences.focusAreas} @> ARRAY[${query.field}]::text[]`);
  }

  const pendingSql = pendingRequestsSql();
  if (query.availability === "available") {
    clauses.push(sql`${pendingSql} < 3`);
  } else if (query.availability === "fully-booked") {
    clauses.push(sql`${pendingSql} >= 3`);
  }

  return and(...clauses) as SQL;
}

export async function listMentors(params: {
  query: MentorshipQuery;
  viewerUserId?: string;
}): Promise<MentorListItem[]> {
  const where = buildMentorWhereClause(params.query, params.viewerUserId);
  const pendingSql = pendingRequestsSql();
  const hasPendingSql = hasPendingRequestFromViewerSql(params.viewerUserId ?? null);

  const rows = await db
    .select({
      userId: alumniProfiles.userId,
      profileId: alumniProfiles.id,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      avatarKey: alumniProfiles.avatarKey,
      jobTitle: alumniProfiles.currentJobTitle,
      classYear: alumniProfiles.yearOfCompletion,
      focusAreas: mentorshipPreferences.focusAreas,
      pendingRequestCount: pendingSql,
      hasPendingRequestFromViewer: hasPendingSql,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .leftJoin(mentorshipPreferences, eq(mentorshipPreferences.userId, alumniProfiles.userId))
    .where(where)
    .orderBy(asc(alumniProfiles.firstName), asc(alumniProfiles.lastName));

  return rows.map((row) => ({
    userId: row.userId,
    profileId: row.profileId,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
    jobTitle: row.jobTitle,
    classYear: row.classYear,
    focusAreas: row.focusAreas ?? [],
    pendingRequestCount: row.pendingRequestCount,
    hasPendingRequestFromViewer: row.hasPendingRequestFromViewer,
  }));
}

export async function getMentorByUserId(params: {
  mentorUserId: string;
  viewerUserId?: string;
}): Promise<MentorRequestHeader | null> {
  const pendingSql = pendingRequestsSql();
  const hasPendingSql = hasPendingRequestFromViewerSql(params.viewerUserId ?? null);

  const [row] = await db
    .select({
      userId: alumniProfiles.userId,
      profileId: alumniProfiles.id,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      avatarKey: alumniProfiles.avatarKey,
      jobTitle: alumniProfiles.currentJobTitle,
      classYear: alumniProfiles.yearOfCompletion,
      focusAreas: mentorshipPreferences.focusAreas,
      pendingRequestCount: pendingSql,
      hasPendingRequestFromViewer: hasPendingSql,
      isAvailableForMentorship: alumniProfiles.isAvailableForMentorship,
    })
    .from(alumniProfiles)
    .leftJoin(mentorshipPreferences, eq(mentorshipPreferences.userId, alumniProfiles.userId))
    .where(eq(alumniProfiles.userId, params.mentorUserId))
    .limit(1);

  if (!row || !row.isAvailableForMentorship) {
    return null;
  }

  return {
    userId: row.userId,
    profileId: row.profileId,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
    jobTitle: row.jobTitle,
    classYear: row.classYear,
    focusAreas: row.focusAreas ?? [],
    pendingRequestCount: row.pendingRequestCount,
    hasPendingRequestFromViewer: row.hasPendingRequestFromViewer,
  };
}

export async function countPendingMenteeRequests(menteeUserId: string): Promise<number> {
  const [row] = await db
    .select({
      value: sql<number>`count(*)::int`,
    })
    .from(mentorshipRequests)
    .where(and(eq(mentorshipRequests.menteeId, menteeUserId), eq(mentorshipRequests.status, "pending")));

  return row?.value ?? 0;
}
