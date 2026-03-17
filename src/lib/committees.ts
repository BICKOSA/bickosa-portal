import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  committeeMembers,
  committeeNominations,
  committees,
  consentLogs,
  users,
} from "@/lib/db/schema";

export type CommitteeWithCounts = {
  id: string;
  name: string;
  purpose: string;
  maxMembers: number | null;
  nominationOpens: Date;
  nominationCloses: Date;
  status: "draft" | "nominations_open" | "nominations_closed" | "active" | "dissolved";
  createdAt: Date;
  nominationCount: number;
  confirmedCount: number;
};

export async function getUserVerifiedMemberState(userId: string, emailVerified?: boolean): Promise<boolean> {
  if (emailVerified) {
    return true;
  }

  const profile = await db.query.alumniProfiles.findFirst({
    where: eq(alumniProfiles.userId, userId),
    columns: { verificationStatus: true },
  });

  return profile?.verificationStatus === "verified";
}

export async function listCommitteesForHub(): Promise<{
  current: CommitteeWithCounts[];
  previous: CommitteeWithCounts[];
}> {
  const rows = await db
    .select({
      id: committees.id,
      name: committees.name,
      purpose: committees.purpose,
      maxMembers: committees.maxMembers,
      nominationOpens: committees.nominationOpens,
      nominationCloses: committees.nominationCloses,
      status: committees.status,
      createdAt: committees.createdAt,
      nominationCount: sql<number>`count(${committeeNominations.id})::int`,
      confirmedCount: sql<number>`count(*) filter (where ${committeeNominations.status} in ('confirmed_willing', 'appointed'))::int`,
    })
    .from(committees)
    .leftJoin(committeeNominations, eq(committeeNominations.committeeId, committees.id))
    .groupBy(
      committees.id,
      committees.name,
      committees.purpose,
      committees.maxMembers,
      committees.nominationOpens,
      committees.nominationCloses,
      committees.status,
      committees.createdAt,
    )
    .orderBy(desc(committees.nominationOpens), desc(committees.createdAt));

  const current = rows.filter(
    (committee) => committee.status === "active" || committee.status === "nominations_open",
  );
  const previous = rows.filter(
    (committee) =>
      committee.status === "nominations_closed" ||
      committee.status === "dissolved" ||
      committee.status === "draft",
  );

  return { current, previous };
}

export async function getCommitteeDetail(committeeId: string) {
  const committee = await db.query.committees.findFirst({
    where: eq(committees.id, committeeId),
  });
  if (!committee) {
    return null;
  }

  const [approvedNominations, memberCountRow] = await Promise.all([
    db
      .select({
        nominationId: committeeNominations.id,
        nomineeId: committeeNominations.nomineeId,
        reason: committeeNominations.reason,
        status: committeeNominations.status,
        createdAt: committeeNominations.createdAt,
        nomineeName: users.name,
        nomineeYear: alumniProfiles.yearOfCompletion,
      })
      .from(committeeNominations)
      .innerJoin(users, eq(users.id, committeeNominations.nomineeId))
      .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
      .where(
        and(
          eq(committeeNominations.committeeId, committeeId),
          inArray(committeeNominations.status, ["confirmed_willing", "appointed"]),
        ),
      )
      .orderBy(desc(committeeNominations.createdAt)),
    db
      .select({ value: count(committeeMembers.id) })
      .from(committeeMembers)
      .where(eq(committeeMembers.committeeId, committeeId)),
  ]);

  return {
    committee,
    approvedNominations,
    memberCount: memberCountRow[0]?.value ?? 0,
  };
}

export async function listVerifiedAlumniForNominationSearch(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const pattern = `%${trimmed}%`;
  return db
    .select({
      userId: users.id,
      name: users.name,
      yearOfCompletion: alumniProfiles.yearOfCompletion,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .where(
      and(
        eq(alumniProfiles.verificationStatus, "verified"),
        or(
          ilike(users.name, pattern),
          ilike(alumniProfiles.firstName, pattern),
          ilike(alumniProfiles.lastName, pattern),
        ),
      ),
    )
    .orderBy(asc(users.name))
    .limit(15);
}

export async function listAdminCommittees() {
  return db
    .select({
      id: committees.id,
      name: committees.name,
      purpose: committees.purpose,
      status: committees.status,
      nominationOpens: committees.nominationOpens,
      nominationCloses: committees.nominationCloses,
      createdAt: committees.createdAt,
      maxMembers: committees.maxMembers,
      nominationCount: sql<number>`count(${committeeNominations.id})::int`,
      confirmedCount: sql<number>`count(*) filter (where ${committeeNominations.status} = 'confirmed_willing')::int`,
      appointedCount: sql<number>`count(*) filter (where ${committeeNominations.status} = 'appointed')::int`,
    })
    .from(committees)
    .leftJoin(committeeNominations, eq(committeeNominations.committeeId, committees.id))
    .groupBy(
      committees.id,
      committees.name,
      committees.purpose,
      committees.status,
      committees.nominationOpens,
      committees.nominationCloses,
      committees.createdAt,
      committees.maxMembers,
    )
    .orderBy(desc(committees.createdAt));
}

export async function listCommitteeNominationsForAdmin(params: {
  committeeId: string;
  status?: "pending" | "confirmed_willing" | "declined" | "appointed" | null;
}) {
  const whereClause = params.status
    ? and(
        eq(committeeNominations.committeeId, params.committeeId),
        eq(committeeNominations.status, params.status),
      )
    : eq(committeeNominations.committeeId, params.committeeId);

  const rows = await db
    .select({
      nominationId: committeeNominations.id,
      nomineeId: committeeNominations.nomineeId,
      nomineeName: users.name,
      nomineeYear: alumniProfiles.yearOfCompletion,
      nominatedById: committeeNominations.nominatedById,
      reason: committeeNominations.reason,
      status: committeeNominations.status,
      confirmationSentAt: committeeNominations.confirmationSentAt,
      respondedAt: committeeNominations.respondedAt,
      responseNote: committeeNominations.responseNote,
      createdAt: committeeNominations.createdAt,
    })
    .from(committeeNominations)
    .innerJoin(users, eq(users.id, committeeNominations.nomineeId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, committeeNominations.nomineeId))
    .where(whereClause)
    .orderBy(desc(committeeNominations.createdAt));

  const nominatorIds = Array.from(new Set(rows.map((row) => row.nominatedById)));
  const nominators =
    nominatorIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, nominatorIds))
      : [];
  const nominatorNameById = new Map(nominators.map((nominator) => [nominator.id, nominator.name]));

  return rows.map((row) => ({
    ...row,
    nominatedByName: nominatorNameById.get(row.nominatedById) ?? "Member",
  }));
}

export async function getCommitteeNominationById(nominationId: string) {
  return db.query.committeeNominations.findFirst({
    where: eq(committeeNominations.id, nominationId),
  });
}

export async function logCommitteeNominationStatusChange(input: {
  nominationId: string;
  fromStatus: "pending" | "confirmed_willing" | "declined" | "appointed";
  toStatus: "pending" | "confirmed_willing" | "declined" | "appointed";
  changedBy: string;
}) {
  await db.insert(consentLogs).values({
    userId: input.changedBy,
    consentType: "data_processing",
    granted: true,
    action: "committee_nomination_status_change",
    resourceType: "committee_nomination",
    resourceId: input.nominationId,
    metadata: {
      from_status: input.fromStatus,
      to_status: input.toStatus,
      changed_by: input.changedBy,
    },
    createdAt: new Date(),
  });
}

export async function listAdminUserIdsForCommitteeNotifications(excludeUserId?: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(excludeUserId ? and(eq(users.role, "admin"), ne(users.id, excludeUserId)) : eq(users.role, "admin"));
  return rows.map((row) => row.id);
}

