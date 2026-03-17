import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  chapters,
  consentLogs,
  users,
  verificationEvents,
} from "@/lib/db/schema";
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from "@/lib/email/resend";
import { createNotification } from "@/lib/notifications/create-notification";
import { buildR2PublicUrl } from "@/lib/r2";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type VerificationStatus = "pending" | "verified" | "rejected";
export type VerificationAction = "submitted" | "approved" | "rejected" | "suspended";

export type AdminMemberListStatus = VerificationStatus | "all";
export type AdminMemberSortField =
  | "name"
  | "classYear"
  | "email"
  | "chapter"
  | "status"
  | "joinedAt";
export type AdminSortDirection = "asc" | "desc";

export type AdminMemberFilters = {
  status: AdminMemberListStatus;
  chapterId: string | null;
  classYear: number | null;
  query: string;
  sortBy: AdminMemberSortField;
  sortDir: AdminSortDirection;
  page: number;
  pageSize: number;
};

export type AdminMemberRow = {
  profileId: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  classYear: number | null;
  email: string;
  chapterName: string | null;
  status: VerificationStatus;
  joinedAt: Date;
};

export type AdminMemberListResult = {
  rows: AdminMemberRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminMemberChapterOption = {
  id: string;
  name: string;
};

export type AdminMemberVerificationEvent = {
  id: string;
  action: VerificationAction;
  notes: string | null;
  createdAt: Date;
  actorName: string;
  actorEmail: string;
};

export type AdminMemberConsentLog = {
  id: string;
  consentType: "directory" | "marketing" | "photography" | "data_processing";
  granted: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type AdminMemberProfileDetail = {
  profileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  status: VerificationStatus;
  verifiedAt: Date | null;
  verifiedById: string | null;
  membershipTier: "standard" | "lifetime";
  membershipExpiresAt: Date | null;
  chapterId: string | null;
  chapterName: string | null;
  yearOfEntry: number | null;
  yearOfCompletion: number | null;
  currentJobTitle: string | null;
  currentEmployer: string | null;
  industry: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  phone: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  isAvailableForMentorship: boolean;
  joinedAt: Date;
  verificationHistory: AdminMemberVerificationEvent[];
  consentLogs: AdminMemberConsentLog[];
};

export type VerifyMemberActionInput = {
  profileId: string;
  adminUserId: string;
  action: "approve" | "reject" | "suspend";
  notes?: string | null;
  chapterId?: string | null;
};

function toNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getParam(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  if (input instanceof URLSearchParams) {
    return input.get(key);
  }

  const rawValue = input[key];
  if (Array.isArray(rawValue)) {
    return rawValue[0] ?? null;
  }

  return rawValue ?? null;
}

export function normalizeAdminMemberFilters(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): AdminMemberFilters {
  const statusParam = getParam(input, "status");
  const status: AdminMemberListStatus =
    statusParam === "pending" || statusParam === "verified" || statusParam === "rejected"
      ? statusParam
      : "all";
  const chapterId = (getParam(input, "chapter") ?? "").trim() || null;
  const classYear = toNumber(getParam(input, "classYear"));
  const query = (getParam(input, "q") ?? "").trim().slice(0, 120);

  const sortByParam = getParam(input, "sort");
  const sortBy: AdminMemberSortField =
    sortByParam === "classYear" ||
    sortByParam === "email" ||
    sortByParam === "chapter" ||
    sortByParam === "status" ||
    sortByParam === "joinedAt"
      ? sortByParam
      : "name";
  const sortDirParam = getParam(input, "dir");
  const sortDir: AdminSortDirection = sortDirParam === "asc" ? "asc" : "desc";

  const page = Math.max(DEFAULT_PAGE, toNumber(getParam(input, "page")) ?? DEFAULT_PAGE);
  const requestedPageSize = toNumber(getParam(input, "pageSize")) ?? DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedPageSize));

  return {
    status,
    chapterId,
    classYear,
    query,
    sortBy,
    sortDir,
    page,
    pageSize,
  };
}

function buildWhereClause(filters: AdminMemberFilters): SQL | undefined {
  const clauses: SQL[] = [];

  if (filters.status !== "all") {
    clauses.push(eq(alumniProfiles.verificationStatus, filters.status));
  }

  if (filters.chapterId) {
    clauses.push(eq(alumniProfiles.chapterId, filters.chapterId));
  }

  if (filters.classYear !== null) {
    clauses.push(eq(alumniProfiles.yearOfCompletion, filters.classYear));
  }

  if (filters.query) {
    const term = `%${filters.query}%`;
    clauses.push(
      sql`(
        ${alumniProfiles.firstName} ilike ${term}
        or ${alumniProfiles.lastName} ilike ${term}
        or ${users.email} ilike ${term}
      )`,
    );
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return and(...clauses) as SQL;
}

function buildOrderBy(filters: AdminMemberFilters): SQL[] {
  const direction = filters.sortDir === "asc" ? asc : desc;

  switch (filters.sortBy) {
    case "classYear":
      return [direction(alumniProfiles.yearOfCompletion), asc(alumniProfiles.lastName)];
    case "email":
      return [direction(users.email), asc(alumniProfiles.lastName)];
    case "chapter":
      return [direction(chapters.name), asc(alumniProfiles.lastName)];
    case "status":
      return [direction(alumniProfiles.verificationStatus), asc(alumniProfiles.lastName)];
    case "joinedAt":
      return [direction(users.createdAt), asc(alumniProfiles.lastName)];
    case "name":
    default:
      return [
        direction(sql`concat(${alumniProfiles.firstName}, ' ', ${alumniProfiles.lastName})`),
        asc(alumniProfiles.lastName),
      ];
  }
}

export async function listAdminMembers(filters: AdminMemberFilters): Promise<AdminMemberListResult> {
  const where = buildWhereClause(filters);
  const [rows, totals] = await Promise.all([
    db
      .select({
        profileId: alumniProfiles.id,
        userId: alumniProfiles.userId,
        firstName: alumniProfiles.firstName,
        lastName: alumniProfiles.lastName,
        avatarKey: alumniProfiles.avatarKey,
        classYear: alumniProfiles.yearOfCompletion,
        email: users.email,
        chapterName: chapters.name,
        status: alumniProfiles.verificationStatus,
        joinedAt: users.createdAt,
      })
      .from(alumniProfiles)
      .innerJoin(users, eq(users.id, alumniProfiles.userId))
      .leftJoin(chapters, eq(chapters.id, alumniProfiles.chapterId))
      .where(where)
      .orderBy(...buildOrderBy(filters))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(alumniProfiles)
      .innerJoin(users, eq(users.id, alumniProfiles.userId))
      .leftJoin(chapters, eq(chapters.id, alumniProfiles.chapterId))
      .where(where),
  ]);

  const total = totals[0]?.value ?? 0;

  return {
    rows: rows.map((row) => ({
      profileId: row.profileId,
      userId: row.userId,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
      classYear: row.classYear,
      email: row.email,
      chapterName: row.chapterName,
      status: row.status,
      joinedAt: row.joinedAt,
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function listAdminMemberChapterOptions(): Promise<AdminMemberChapterOption[]> {
  return db
    .select({
      id: chapters.id,
      name: chapters.name,
    })
    .from(chapters)
    .where(eq(chapters.isActive, true))
    .orderBy(asc(chapters.name));
}

export async function getAdminMemberProfileDetail(
  profileId: string,
): Promise<AdminMemberProfileDetail | null> {
  const profile = await db
    .select({
      profileId: alumniProfiles.id,
      userId: alumniProfiles.userId,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      email: users.email,
      avatarKey: alumniProfiles.avatarKey,
      status: alumniProfiles.verificationStatus,
      verifiedAt: alumniProfiles.verifiedAt,
      verifiedById: alumniProfiles.verifiedById,
      membershipTier: alumniProfiles.membershipTier,
      membershipExpiresAt: alumniProfiles.membershipExpiresAt,
      chapterId: alumniProfiles.chapterId,
      chapterName: chapters.name,
      yearOfEntry: alumniProfiles.yearOfEntry,
      yearOfCompletion: alumniProfiles.yearOfCompletion,
      currentJobTitle: alumniProfiles.currentJobTitle,
      currentEmployer: alumniProfiles.currentEmployer,
      industry: alumniProfiles.industry,
      locationCity: alumniProfiles.locationCity,
      locationCountry: alumniProfiles.locationCountry,
      phone: alumniProfiles.phone,
      bio: alumniProfiles.bio,
      linkedinUrl: alumniProfiles.linkedinUrl,
      websiteUrl: alumniProfiles.websiteUrl,
      isAvailableForMentorship: alumniProfiles.isAvailableForMentorship,
      joinedAt: users.createdAt,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .leftJoin(chapters, eq(chapters.id, alumniProfiles.chapterId))
    .where(eq(alumniProfiles.id, profileId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!profile) {
    return null;
  }

  const [verificationHistory, consentHistory] = await Promise.all([
    db
      .select({
        id: verificationEvents.id,
        action: verificationEvents.action,
        notes: verificationEvents.notes,
        createdAt: verificationEvents.createdAt,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(verificationEvents)
      .innerJoin(users, eq(users.id, verificationEvents.actorId))
      .where(eq(verificationEvents.alumniProfileId, profileId))
      .orderBy(desc(verificationEvents.createdAt)),
    db
      .select({
        id: consentLogs.id,
        consentType: consentLogs.consentType,
        granted: consentLogs.granted,
        ipAddress: consentLogs.ipAddress,
        userAgent: consentLogs.userAgent,
        createdAt: consentLogs.createdAt,
      })
      .from(consentLogs)
      .where(eq(consentLogs.userId, profile.userId))
      .orderBy(desc(consentLogs.createdAt)),
  ]);

  return {
    profileId: profile.profileId,
    userId: profile.userId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    fullName: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    avatarUrl: profile.avatarKey ? buildR2PublicUrl(profile.avatarKey) : null,
    status: profile.status,
    verifiedAt: profile.verifiedAt,
    verifiedById: profile.verifiedById,
    membershipTier: profile.membershipTier,
    membershipExpiresAt: profile.membershipExpiresAt,
    chapterId: profile.chapterId,
    chapterName: profile.chapterName,
    yearOfEntry: profile.yearOfEntry,
    yearOfCompletion: profile.yearOfCompletion,
    currentJobTitle: profile.currentJobTitle,
    currentEmployer: profile.currentEmployer,
    industry: profile.industry,
    locationCity: profile.locationCity,
    locationCountry: profile.locationCountry,
    phone: profile.phone,
    bio: profile.bio,
    linkedinUrl: profile.linkedinUrl,
    websiteUrl: profile.websiteUrl,
    isAvailableForMentorship: profile.isAvailableForMentorship,
    joinedAt: profile.joinedAt,
    verificationHistory,
    consentLogs: consentHistory,
  };
}

async function resolveChapterIdByCountry(country: string | null): Promise<string | null> {
  if (!country) {
    return null;
  }

  const normalizedCountry = country.trim();
  if (!normalizedCountry) {
    return null;
  }

  const exactMatch = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(and(eq(chapters.isActive, true), ilike(chapters.country, normalizedCountry)))
    .orderBy(desc(chapters.memberCount), asc(chapters.name))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return exactMatch?.id ?? null;
}

function normalizeNotes(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function verifyMemberProfileAction(input: VerifyMemberActionInput): Promise<{
  profileId: string;
  status: VerificationStatus;
}> {
  const notes = normalizeNotes(input.notes);

  if (input.action === "reject" && !notes) {
    throw new Error("A rejection reason is required.");
  }

  const profile = await db
    .select({
      profileId: alumniProfiles.id,
      userId: alumniProfiles.userId,
      firstName: alumniProfiles.firstName,
      locationCountry: alumniProfiles.locationCountry,
      membershipTier: alumniProfiles.membershipTier,
      chapterId: alumniProfiles.chapterId,
      email: users.email,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .where(eq(alumniProfiles.id, input.profileId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!profile) {
    throw new Error("Member profile not found.");
  }

  const now = new Date();
  let nextStatus: VerificationStatus = "pending";
  let assignedChapterId: string | null = profile.chapterId;

  if (input.action === "approve") {
    const selectedChapterId = input.chapterId ?? null;
    assignedChapterId =
      selectedChapterId || (await resolveChapterIdByCountry(profile.locationCountry)) || profile.chapterId;
    nextStatus = "verified";
  } else if (input.action === "reject") {
    nextStatus = "rejected";
  } else {
    nextStatus = "rejected";
  }

  await db.transaction(async (tx) => {
    if (input.action === "suspend") {
      await tx
        .update(users)
        .set({
          banned: true,
          banReason: notes ?? "Suspended by administrator.",
          updatedAt: now,
        })
        .where(eq(users.id, profile.userId));
    } else {
      await tx
        .update(users)
        .set({
          banned: false,
          banReason: null,
          banExpires: null,
          updatedAt: now,
        })
        .where(eq(users.id, profile.userId));
    }

    await tx
      .update(alumniProfiles)
      .set({
        verificationStatus: nextStatus,
        verifiedAt: input.action === "approve" ? now : null,
        verifiedById: input.adminUserId,
        chapterId: input.action === "approve" ? assignedChapterId : profile.chapterId,
        updatedAt: now,
      })
      .where(eq(alumniProfiles.id, input.profileId));

    await tx.insert(verificationEvents).values({
      alumniProfileId: input.profileId,
      actorId: input.adminUserId,
      action:
        input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "suspended",
      notes,
      createdAt: now,
    });
  });

  if (input.action === "approve") {
    await sendVerificationApprovedEmail({
      to: profile.email,
      firstName: profile.firstName,
      membershipTier: profile.membershipTier,
    });
    await createNotification({
      userId: profile.userId,
      type: "verification_approved",
      title: "Your membership has been verified!",
      body: "Welcome aboard. You now have full access to verified member features.",
      actionUrl: "/profile",
    });
  } else if (input.action === "reject") {
    await sendVerificationRejectedEmail({
      to: profile.email,
      firstName: profile.firstName,
      reason: notes ?? "Your verification request needs additional review.",
    });
    await createNotification({
      userId: profile.userId,
      type: "verification_rejected",
      title: "Membership verification update",
      body: notes ?? "Your verification request needs additional review.",
      actionUrl: "/profile",
    });
  }

  return {
    profileId: input.profileId,
    status: nextStatus,
  };
}

export async function verifyMemberProfilesBulk(input: {
  profileIds: string[];
  adminUserId: string;
  action: "approve" | "reject";
  notes?: string | null;
  chapterId?: string | null;
}): Promise<{ processed: number }> {
  const uniqueIds = Array.from(new Set(input.profileIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { processed: 0 };
  }

  const profiles = await db
    .select({ id: alumniProfiles.id })
    .from(alumniProfiles)
    .where(inArray(alumniProfiles.id, uniqueIds));

  let processed = 0;
  for (const profile of profiles) {
    await verifyMemberProfileAction({
      profileId: profile.id,
      adminUserId: input.adminUserId,
      action: input.action,
      notes: input.notes,
      chapterId: input.chapterId,
    });
    processed += 1;
  }

  return { processed };
}
