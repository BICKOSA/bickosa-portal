import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  alumniRegistrations,
  cohortRepresentatives,
  cohorts,
  consentLogs,
  donations,
  eventRegistrations,
  events,
  privacySettings,
  schoolEnrollmentRecords,
  users,
  whatsappGroups,
  registrationVerificationStatusEnum,
  whatsappGroupTypeEnum,
} from "@/lib/db/schema";
import {
  sendVerificationRejectedEmail,
  sendWelcomeEmail,
} from "@/lib/email/resend";

type RegistrationStatus =
  (typeof registrationVerificationStatusEnum.enumValues)[number];
type WhatsappGroupType = (typeof whatsappGroupTypeEnum.enumValues)[number];

export type PublicRegistrationInput = {
  fullName: string;
  email: string;
  phone?: string | null;
  graduationYear: number;
  stream?: string | null;
  house?: string | null;
  notableTeachers?: string | null;
  currentLocation?: string | null;
  occupation?: string | null;
  linkedinUrl?: string | null;
  howTheyHeard?: string | null;
  referralCode?: string | null;
  submissionIp?: string | null;
};

export type RegistrationFilters = {
  status: RegistrationStatus | "all";
  graduationYear: number | null;
  fromDate: Date | null;
  toDate: Date | null;
};

export type SchoolRecordMatchResult = {
  score: number;
  label: "Strong match" | "Possible match";
  record: {
    id: string;
    fullName: string;
    graduationYear: number;
    stream: string | null;
    house: string | null;
    admissionNumber: string | null;
  };
};

export type CohortSortOrder = "recent" | "oldest";

function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeNameForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreNameMatch(source: string, candidate: string): number {
  const sourceNormalized = normalizeNameForMatch(source);
  const candidateNormalized = normalizeNameForMatch(candidate);
  if (!sourceNormalized || !candidateNormalized) {
    return 0;
  }
  if (sourceNormalized === candidateNormalized) {
    return 100;
  }

  const sourceParts = sourceNormalized.split(" ");
  const candidateParts = new Set(candidateNormalized.split(" "));
  const shared = sourceParts.filter((part) => candidateParts.has(part)).length;
  const overlap = Math.round((shared / Math.max(sourceParts.length, 1)) * 100);

  if (
    sourceNormalized.includes(candidateNormalized) ||
    candidateNormalized.includes(sourceNormalized)
  ) {
    return Math.max(overlap, 82);
  }

  return overlap;
}

export async function submitPublicRegistration(input: PublicRegistrationInput) {
  const [created] = await db
    .insert(alumniRegistrations)
    .values({
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: normalizeOptional(input.phone),
      graduationYear: input.graduationYear,
      stream: normalizeOptional(input.stream),
      house: normalizeOptional(input.house),
      notableTeachers: normalizeOptional(input.notableTeachers),
      currentLocation: normalizeOptional(input.currentLocation),
      occupation: normalizeOptional(input.occupation),
      linkedinUrl: normalizeOptional(input.linkedinUrl),
      howTheyHeard:
        normalizeOptional(input.referralCode) ??
        normalizeOptional(input.howTheyHeard),
      submissionIp: normalizeOptional(input.submissionIp),
    })
    .returning({
      id: alumniRegistrations.id,
      createdAt: alumniRegistrations.createdAt,
    });

  return created;
}

export async function listAdminRegistrations(filters: RegistrationFilters) {
  const clauses = [];
  if (filters.status !== "all") {
    clauses.push(eq(alumniRegistrations.verificationStatus, filters.status));
  }
  if (filters.graduationYear !== null) {
    clauses.push(
      eq(alumniRegistrations.graduationYear, filters.graduationYear),
    );
  }
  if (filters.fromDate) {
    clauses.push(gte(alumniRegistrations.createdAt, filters.fromDate));
  }
  if (filters.toDate) {
    clauses.push(lte(alumniRegistrations.createdAt, filters.toDate));
  }
  const where = clauses.length > 0 ? and(...clauses) : undefined;

  return db
    .select({
      id: alumniRegistrations.id,
      fullName: alumniRegistrations.fullName,
      email: alumniRegistrations.email,
      graduationYear: alumniRegistrations.graduationYear,
      createdAt: alumniRegistrations.createdAt,
      verificationStatus: alumniRegistrations.verificationStatus,
      schoolRecordMatch: alumniRegistrations.schoolRecordMatch,
    })
    .from(alumniRegistrations)
    .where(where)
    .orderBy(desc(alumniRegistrations.createdAt));
}

export async function findDuplicateProfileMatches(registrationId: string) {
  const registration = await db.query.alumniRegistrations.findFirst({
    where: eq(alumniRegistrations.id, registrationId),
  });
  if (!registration) {
    return [];
  }

  return db
    .select({
      id: alumniProfiles.id,
      userId: users.id,
      fullName: sql<string>`concat(${alumniProfiles.firstName}, ' ', ${alumniProfiles.lastName})`,
      email: users.email,
      graduationYear: alumniProfiles.graduationYear,
      yearOfCompletion: alumniProfiles.yearOfCompletion,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .where(
      or(
        eq(users.email, registration.email),
        and(
          eq(alumniProfiles.yearOfCompletion, registration.graduationYear),
          ilike(
            sql`concat(${alumniProfiles.firstName}, ' ', ${alumniProfiles.lastName})`,
            `%${registration.fullName}%`,
          ),
        ),
      ),
    )
    .limit(12);
}

export async function getRegistrationWithSchoolMatches(
  registrationId: string,
): Promise<{
  registration: Awaited<
    ReturnType<typeof db.query.alumniRegistrations.findFirst>
  > | null;
  matches: SchoolRecordMatchResult[];
}> {
  const registration = await db.query.alumniRegistrations.findFirst({
    where: eq(alumniRegistrations.id, registrationId),
  });
  if (!registration) {
    return { registration: null, matches: [] };
  }

  const records = await db
    .select({
      id: schoolEnrollmentRecords.id,
      fullName: schoolEnrollmentRecords.fullName,
      graduationYear: schoolEnrollmentRecords.graduationYear,
      stream: schoolEnrollmentRecords.stream,
      house: schoolEnrollmentRecords.house,
      admissionNumber: schoolEnrollmentRecords.admissionNumber,
    })
    .from(schoolEnrollmentRecords)
    .where(
      eq(schoolEnrollmentRecords.graduationYear, registration.graduationYear),
    )
    .limit(75);

  const matches = records
    .map((record) => {
      const score = scoreNameMatch(registration.fullName, record.fullName);
      if (score >= 80) {
        return {
          score,
          label: "Strong match" as const,
          record,
        };
      }
      if (score >= 55) {
        return {
          score,
          label: "Possible match" as const,
          record,
        };
      }
      return null;
    })
    .filter((value): value is SchoolRecordMatchResult => value !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return { registration, matches };
}

function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName: firstName ?? "Alumni",
    lastName: rest.length > 0 ? rest.join(" ") : "Member",
  };
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function randomPassword() {
  return `${crypto.randomUUID()}Aa!9`;
}

async function ensureUserAccountFromRegistration(input: {
  email: string;
  fullName: string;
}) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });
  if (existing) {
    return existing;
  }

  const appUrl = getAppUrl();
  const response = await fetch(`${appUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: input.fullName,
      email: input.email.toLowerCase(),
      password: randomPassword(),
      callbackURL: `${appUrl}/reset-password`,
      rememberMe: false,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to create account through auth service.");
  }

  const created = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });
  if (!created) {
    throw new Error("Account creation did not return a user.");
  }

  return created;
}

async function dispatchSetPasswordEmail(email: string) {
  const appUrl = getAppUrl();
  await fetch(`${appUrl}/api/auth/request-password-reset`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email,
      redirectTo: `${appUrl}/reset-password`,
    }),
    cache: "no-store",
  });
}

export async function verifyRegistrationAndCreateAccount(input: {
  registrationId: string;
  adminUserId: string;
  verificationNotes?: string | null;
  schoolRecordMatch: boolean;
}) {
  const registration = await db.query.alumniRegistrations.findFirst({
    where: eq(alumniRegistrations.id, input.registrationId),
  });
  if (!registration) {
    throw new Error("Registration not found.");
  }

  const user = await ensureUserAccountFromRegistration({
    email: registration.email,
    fullName: registration.fullName,
  });
  const names = splitFullName(registration.fullName);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    await tx
      .insert(alumniProfiles)
      .values({
        userId: user.id,
        firstName: names.firstName,
        lastName: names.lastName,
        graduationYear: registration.graduationYear,
        yearOfCompletion: registration.graduationYear,
        phone: registration.phone,
        locationCity: registration.currentLocation,
        currentJobTitle: registration.occupation,
        linkedinUrl: registration.linkedinUrl,
        verificationStatus: "verified",
        verifiedAt: now,
        verifiedById: input.adminUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: alumniProfiles.userId,
        set: {
          firstName: names.firstName,
          lastName: names.lastName,
          graduationYear: registration.graduationYear,
          yearOfCompletion: registration.graduationYear,
          phone: registration.phone,
          locationCity: registration.currentLocation,
          currentJobTitle: registration.occupation,
          linkedinUrl: registration.linkedinUrl,
          verificationStatus: "verified",
          verifiedAt: now,
          verifiedById: input.adminUserId,
          updatedAt: now,
        },
      });

    await tx
      .update(alumniRegistrations)
      .set({
        verificationStatus: "verified",
        verificationNotes: normalizeOptional(input.verificationNotes),
        schoolRecordMatch: input.schoolRecordMatch,
        reviewedBy: input.adminUserId,
        reviewedAt: now,
        convertedToUserId: user.id,
      })
      .where(eq(alumniRegistrations.id, registration.id));

    await tx.insert(consentLogs).values({
      userId: input.adminUserId,
      consentType: "data_processing",
      granted: true,
      action: "school_record_match_decision",
      resourceType: "alumni_registration",
      resourceId: registration.id,
      metadata: {
        schoolRecordMatch: input.schoolRecordMatch,
      },
    });
  });

  await sendWelcomeEmail({
    to: registration.email,
    firstName: names.firstName,
    classYear: String(registration.graduationYear),
    chapterAssigned: "BICKOSA Alumni",
    profileUrl: `${getAppUrl()}/profile`,
  });
  await dispatchSetPasswordEmail(registration.email);
}

export async function rejectRegistration(input: {
  registrationId: string;
  adminUserId: string;
  reason?: string | null;
}) {
  const registration = await db.query.alumniRegistrations.findFirst({
    where: eq(alumniRegistrations.id, input.registrationId),
  });
  if (!registration) {
    throw new Error("Registration not found.");
  }

  const reason =
    normalizeOptional(input.reason) ??
    "We could not verify your details at this time.";
  const firstName = splitFullName(registration.fullName).firstName;
  const now = new Date();
  await db
    .update(alumniRegistrations)
    .set({
      verificationStatus: "rejected",
      verificationNotes: reason,
      reviewedBy: input.adminUserId,
      reviewedAt: now,
    })
    .where(eq(alumniRegistrations.id, registration.id));

  await sendVerificationRejectedEmail({
    to: registration.email,
    firstName,
    reason,
  });
}

export async function markRegistrationDuplicate(input: {
  registrationId: string;
  adminUserId: string;
  notes?: string | null;
}) {
  await db
    .update(alumniRegistrations)
    .set({
      verificationStatus: "duplicate",
      verificationNotes: normalizeOptional(input.notes),
      reviewedBy: input.adminUserId,
      reviewedAt: new Date(),
    })
    .where(eq(alumniRegistrations.id, input.registrationId));
}

type SchoolRecordImportRow = {
  fullName: string;
  graduationYear: number;
  stream: string | null;
  house: string | null;
  admissionNumber: string | null;
};

function parseCsvLine(line: string): string[] {
  const output: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const isEscapedQuote = inQuotes && line[index + 1] === '"';
      if (isEscapedQuote) {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      output.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  output.push(current.trim());
  return output.map((value) => value.replace(/^"|"$/g, "").trim());
}

export function previewSchoolRecordsCsv(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1, 11).map((line) => parseCsvLine(line));
  return { headers, rows };
}

function mapSchoolRecordRow(
  headers: string[],
  values: string[],
): SchoolRecordImportRow | null {
  const toHeaderIndex = (aliases: string[]) =>
    headers.findIndex((header) =>
      aliases.includes(header.toLowerCase().trim()),
    );

  const fullNameIndex = toHeaderIndex(["full_name", "fullname", "name"]);
  const yearIndex = toHeaderIndex(["graduation_year", "year", "class_year"]);
  if (fullNameIndex < 0 || yearIndex < 0) {
    return null;
  }

  const streamIndex = toHeaderIndex(["stream"]);
  const houseIndex = toHeaderIndex(["house"]);
  const admissionIndex = toHeaderIndex(["admission_number", "admission_no"]);
  const graduationYear = Number.parseInt(values[yearIndex] ?? "", 10);
  if (!Number.isFinite(graduationYear)) {
    return null;
  }

  const fullName = (values[fullNameIndex] ?? "").trim();
  if (!fullName) {
    return null;
  }

  return {
    fullName,
    graduationYear,
    stream: normalizeOptional(values[streamIndex] ?? null),
    house: normalizeOptional(values[houseIndex] ?? null),
    admissionNumber: normalizeOptional(values[admissionIndex] ?? null),
  };
}

export async function importSchoolRecordsFromCsv(input: {
  csvText: string;
  sourceFile: string;
  uploadedBy: string;
}) {
  const lines = input.csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    throw new Error("CSV must include a header and at least one data row.");
  }
  const headers = parseCsvLine(lines[0] ?? "");
  const parsedRows = lines
    .slice(1)
    .map((line) => mapSchoolRecordRow(headers, parseCsvLine(line)))
    .filter((row): row is SchoolRecordImportRow => row !== null);
  if (parsedRows.length === 0) {
    throw new Error("No valid school records found in uploaded file.");
  }

  await db.insert(schoolEnrollmentRecords).values(
    parsedRows.map((row) => ({
      fullName: row.fullName,
      graduationYear: row.graduationYear,
      stream: row.stream,
      house: row.house,
      admissionNumber: row.admissionNumber,
      sourceFile: input.sourceFile,
      uploadedBy: input.uploadedBy,
    })),
  );

  return { imported: parsedRows.length };
}

export async function listSchoolRecordBatches() {
  return db
    .select({
      sourceFile: schoolEnrollmentRecords.sourceFile,
      uploadedAt: sql<Date>`max(${schoolEnrollmentRecords.uploadedAt})`,
      rowCount: count(schoolEnrollmentRecords.id),
      uploadedBy: users.name,
    })
    .from(schoolEnrollmentRecords)
    .leftJoin(users, eq(users.id, schoolEnrollmentRecords.uploadedBy))
    .groupBy(schoolEnrollmentRecords.sourceFile, users.name)
    .orderBy(desc(sql`max(${schoolEnrollmentRecords.uploadedAt})`));
}

export async function listSchoolRecords(query: string) {
  const term = query.trim();
  return db
    .select({
      id: schoolEnrollmentRecords.id,
      fullName: schoolEnrollmentRecords.fullName,
      graduationYear: schoolEnrollmentRecords.graduationYear,
      stream: schoolEnrollmentRecords.stream,
      house: schoolEnrollmentRecords.house,
      sourceFile: schoolEnrollmentRecords.sourceFile,
    })
    .from(schoolEnrollmentRecords)
    .where(
      term ? ilike(schoolEnrollmentRecords.fullName, `%${term}%`) : undefined,
    )
    .orderBy(desc(schoolEnrollmentRecords.uploadedAt))
    .limit(200);
}

export async function ensureCohortsFromProfiles() {
  const years = await db
    .select({
      year: sql<number>`coalesce(${alumniProfiles.graduationYear}, ${alumniProfiles.yearOfCompletion})`,
    })
    .from(alumniProfiles)
    .where(
      sql`coalesce(${alumniProfiles.graduationYear}, ${alumniProfiles.yearOfCompletion}) is not null`,
    )
    .groupBy(
      sql`coalesce(${alumniProfiles.graduationYear}, ${alumniProfiles.yearOfCompletion})`,
    );

  for (const year of years) {
    await db
      .insert(cohorts)
      .values({
        graduationYear: year.year,
        name: `Class of ${year.year}`,
      })
      .onConflictDoNothing();
  }
}

export async function listCohortsDirectory(sortOrder: CohortSortOrder) {
  await ensureCohortsFromProfiles();

  const rows = await db
    .select({
      cohortId: cohorts.id,
      graduationYear: cohorts.graduationYear,
      cohortName: cohorts.name,
      memberCount: count(alumniProfiles.id),
      representativeName: users.name,
    })
    .from(cohorts)
    .innerJoin(
      alumniProfiles,
      eq(
        sql`coalesce(${alumniProfiles.graduationYear}, ${alumniProfiles.yearOfCompletion})`,
        cohorts.graduationYear,
      ),
    )
    .leftJoin(
      cohortRepresentatives,
      and(
        eq(cohortRepresentatives.cohortId, cohorts.id),
        eq(cohortRepresentatives.isActive, true),
      ),
    )
    .leftJoin(users, eq(users.id, cohortRepresentatives.userId))
    .groupBy(cohorts.id, cohorts.graduationYear, cohorts.name, users.name)
    .orderBy(
      sortOrder === "oldest"
        ? asc(cohorts.graduationYear)
        : desc(cohorts.graduationYear),
    );

  return rows;
}

export async function getCohortPageData(year: number) {
  await ensureCohortsFromProfiles();

  const cohort = await db.query.cohorts.findFirst({
    where: eq(cohorts.graduationYear, year),
  });
  if (!cohort) {
    return null;
  }

  const [representative, members, recentEvents, recentDonations] =
    await Promise.all([
      db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          phone: alumniProfiles.phone,
          showEmail: privacySettings.showEmail,
          showPhone: privacySettings.showPhone,
          role: cohortRepresentatives.role,
        })
        .from(cohortRepresentatives)
        .innerJoin(users, eq(users.id, cohortRepresentatives.userId))
        .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
        .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
        .where(
          and(
            eq(cohortRepresentatives.cohortId, cohort.id),
            eq(cohortRepresentatives.isActive, true),
          ),
        )
        .limit(1)
        .then((result) => result[0] ?? null),
      db
        .select({
          userId: users.id,
          name: users.name,
          currentJobTitle: alumniProfiles.currentJobTitle,
          locationCity: alumniProfiles.locationCity,
        })
        .from(alumniProfiles)
        .innerJoin(users, eq(users.id, alumniProfiles.userId))
        .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
        .where(
          and(
            eq(alumniProfiles.verificationStatus, "verified"),
            eq(
              sql`coalesce(${alumniProfiles.graduationYear}, ${alumniProfiles.yearOfCompletion})`,
              year,
            ),
            or(
              eq(privacySettings.showInDirectory, true),
              isNull(privacySettings.showInDirectory),
            ),
          ),
        )
        .orderBy(asc(users.name)),
      db
        .select({
          id: events.id,
          title: events.title,
          startAt: events.startAt,
        })
        .from(eventRegistrations)
        .innerJoin(events, eq(events.id, eventRegistrations.eventId))
        .innerJoin(
          alumniProfiles,
          eq(alumniProfiles.userId, eventRegistrations.userId),
        )
        .where(
          eq(
            sql`coalesce(${alumniProfiles.graduationYear}, ${alumniProfiles.yearOfCompletion})`,
            year,
          ),
        )
        .groupBy(events.id, events.title, events.startAt)
        .orderBy(desc(events.startAt))
        .limit(8),
      db
        .select({
          id: donations.id,
          amount: donations.amount,
          createdAt: donations.createdAt,
        })
        .from(donations)
        .innerJoin(alumniProfiles, eq(alumniProfiles.userId, donations.userId))
        .where(
          eq(
            sql`coalesce(${alumniProfiles.graduationYear}, ${alumniProfiles.yearOfCompletion})`,
            year,
          ),
        )
        .orderBy(desc(donations.createdAt))
        .limit(8),
    ]);

  return {
    cohort,
    representative,
    members,
    recentEvents,
    recentDonations,
  };
}

export async function listAdminCohorts() {
  await ensureCohortsFromProfiles();

  return db
    .select({
      id: cohorts.id,
      graduationYear: cohorts.graduationYear,
      name: cohorts.name,
      memberCount: count(alumniProfiles.id),
      representativeName: users.name,
    })
    .from(cohorts)
    .leftJoin(
      alumniProfiles,
      eq(
        sql`coalesce(${alumniProfiles.graduationYear}, ${alumniProfiles.yearOfCompletion})`,
        cohorts.graduationYear,
      ),
    )
    .leftJoin(
      cohortRepresentatives,
      and(
        eq(cohortRepresentatives.cohortId, cohorts.id),
        eq(cohortRepresentatives.isActive, true),
      ),
    )
    .leftJoin(users, eq(users.id, cohortRepresentatives.userId))
    .groupBy(cohorts.id, cohorts.graduationYear, cohorts.name, users.name)
    .orderBy(desc(cohorts.graduationYear));
}

export async function searchVerifiedAlumniForReps(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .where(
      and(
        eq(alumniProfiles.verificationStatus, "verified"),
        or(
          ilike(users.name, `%${trimmed}%`),
          ilike(users.email, `%${trimmed}%`),
        ),
      ),
    )
    .orderBy(asc(users.name))
    .limit(20);
}

export async function assignCohortRepresentative(input: {
  cohortId: string;
  userId: string;
  appointedBy: string;
  role: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .update(cohortRepresentatives)
      .set({
        isActive: false,
      })
      .where(eq(cohortRepresentatives.cohortId, input.cohortId));

    await tx.insert(cohortRepresentatives).values({
      cohortId: input.cohortId,
      userId: input.userId,
      role: input.role.trim() || "Representative",
      appointedBy: input.appointedBy,
      isActive: true,
    });
  });
}

export async function listWhatsappGroups() {
  return db
    .select({
      id: whatsappGroups.id,
      name: whatsappGroups.name,
      groupType: whatsappGroups.groupType,
      cohortName: cohorts.name,
      adminName: sql<
        string | null
      >`coalesce(${users.name}, ${whatsappGroups.adminName})`,
      adminPhone: whatsappGroups.adminPhone,
      memberCount: whatsappGroups.memberCount,
      inviteLink: whatsappGroups.inviteLink,
      notes: whatsappGroups.notes,
      lastOutreachAt: whatsappGroups.lastOutreachAt,
      updatedAt: whatsappGroups.updatedAt,
    })
    .from(whatsappGroups)
    .leftJoin(cohorts, eq(cohorts.id, whatsappGroups.cohortId))
    .leftJoin(users, eq(users.id, whatsappGroups.adminUserId))
    .orderBy(desc(whatsappGroups.updatedAt));
}

export async function upsertWhatsappGroup(input: {
  id?: string;
  name: string;
  groupType: WhatsappGroupType;
  cohortId?: string | null;
  adminUserId?: string | null;
  adminName?: string | null;
  adminPhone?: string | null;
  memberCount?: number | null;
  inviteLink?: string | null;
  notes?: string | null;
}) {
  const values = {
    name: input.name.trim(),
    groupType: input.groupType,
    cohortId: input.cohortId ?? null,
    adminUserId: input.adminUserId ?? null,
    adminName: normalizeOptional(input.adminName),
    adminPhone: normalizeOptional(input.adminPhone),
    memberCount: input.memberCount ?? null,
    inviteLink: normalizeOptional(input.inviteLink),
    notes: normalizeOptional(input.notes),
    updatedAt: new Date(),
  };

  if (input.id) {
    await db
      .update(whatsappGroups)
      .set(values)
      .where(eq(whatsappGroups.id, input.id));
    return;
  }

  await db.insert(whatsappGroups).values(values);
}

export async function markGroupOutreachSent(groupId: string) {
  await db
    .update(whatsappGroups)
    .set({
      lastOutreachAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(whatsappGroups.id, groupId));
}

export async function referralLinkPerformance() {
  const totalByRef = await db
    .select({
      refCode: alumniRegistrations.howTheyHeard,
      registrations: count(alumniRegistrations.id),
      verified: count(
        sql`case when ${alumniRegistrations.verificationStatus} = 'verified' then 1 end`,
      ),
    })
    .from(alumniRegistrations)
    .where(sql`${alumniRegistrations.howTheyHeard} is not null`)
    .groupBy(alumniRegistrations.howTheyHeard)
    .orderBy(desc(count(alumniRegistrations.id)));

  return totalByRef.map((row) => {
    const registrations = Number(row.registrations);
    const verified = Number(row.verified);
    return {
      refCode: row.refCode ?? "unknown",
      registrations,
      verified,
      conversionRate: registrations > 0 ? (verified / registrations) * 100 : 0,
    };
  });
}

export function generateJoinLink(refCode: string) {
  const safeCode = refCode.trim().replace(/\s+/g, "-");
  return `${getAppUrl()}/join?ref=${encodeURIComponent(safeCode)}`;
}

export async function listCohortOptions() {
  return db
    .select({
      id: cohorts.id,
      name: cohorts.name,
      graduationYear: cohorts.graduationYear,
    })
    .from(cohorts)
    .orderBy(desc(cohorts.graduationYear));
}

export async function getRegistrationStatsSummary() {
  const [pending] = await db
    .select({
      count: count(alumniRegistrations.id),
    })
    .from(alumniRegistrations)
    .where(eq(alumniRegistrations.verificationStatus, "pending"));
  return {
    pendingCount: Number(pending?.count ?? 0),
  };
}

export function normalizeRegistrationFilters(
  searchParams: URLSearchParams,
): RegistrationFilters {
  const statusParam = searchParams.get("status");
  const status: RegistrationStatus | "all" =
    statusParam === "pending" ||
    statusParam === "verified" ||
    statusParam === "rejected" ||
    statusParam === "duplicate"
      ? statusParam
      : "all";
  const graduationYearRaw = searchParams.get("graduationYear");
  const graduationYear = graduationYearRaw
    ? Number.parseInt(graduationYearRaw, 10)
    : null;
  const fromDateRaw = searchParams.get("from");
  const toDateRaw = searchParams.get("to");

  return {
    status,
    graduationYear: Number.isFinite(graduationYear ?? Number.NaN)
      ? graduationYear
      : null,
    fromDate: fromDateRaw ? new Date(fromDateRaw) : null,
    toDate: toDateRaw ? new Date(toDateRaw) : null,
  };
}
