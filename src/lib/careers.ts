import { and, asc, desc, eq, gt, ilike, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  jobPostings,
  notifications,
  users,
  type JobPosting,
} from "@/lib/db/schema";

export const jobTypeOptions = ["fulltime", "parttime", "contract", "internship", "volunteer"] as const;
export type JobTypeOption = (typeof jobTypeOptions)[number];

export type JobPostingCardData = {
  id: string;
  title: string;
  company: string;
  description: string;
  type: JobTypeOption;
  locationCity: string | null;
  locationCountry: string | null;
  isRemote: boolean;
  salary: string | null;
  applyUrl: string | null;
  applyEmail: string | null;
  postedAt: Date;
  posterClassYear: number | null;
  posterFullName: string;
};

export type AdminJobPostingRow = {
  id: string;
  title: string;
  company: string;
  type: JobTypeOption;
  locationCity: string | null;
  locationCountry: string | null;
  isRemote: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  posterName: string;
  posterEmail: string;
};

export type BusinessDirectoryItem = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  industry: string;
  websiteUrl: string | null;
  isAvailableForMentorship: boolean;
};

const createJobPostingSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(255),
    company: z.string().trim().min(1, "Company is required.").max(255),
    description: z.string().trim().min(40, "Description should be at least 40 characters."),
    type: z.enum(jobTypeOptions),
    locationCity: z.string().trim().max(120).nullable(),
    locationCountry: z.string().trim().max(120).nullable(),
    isRemote: z.boolean(),
    salary: z.string().trim().max(120).nullable(),
    applyUrl: z.union([z.null(), z.url("Provide a valid application URL.")]),
    applyEmail: z.union([z.null(), z.email("Provide a valid application email.")]),
    expiresAt: z.coerce.date(),
  })
  .refine((value) => Boolean(value.applyUrl || value.applyEmail), {
    path: ["applyUrl"],
    message: "Provide either an application URL or email.",
  })
  .refine((value) => value.expiresAt.getTime() > Date.now(), {
    path: ["expiresAt"],
    message: "Expiration date must be in the future.",
  });

type JobPostingInput = z.infer<typeof createJobPostingSchema>;

export function formatJobTypeLabel(type: JobTypeOption): string {
  switch (type) {
    case "fulltime":
      return "Full-time";
    case "parttime":
      return "Part-time";
    case "contract":
      return "Contract";
    case "internship":
      return "Internship";
    case "volunteer":
      return "Volunteer";
    default:
      return "Role";
  }
}

export function parseCreateJobPostingInput(formData: FormData): JobPostingInput {
  const nullableText = (value: FormDataEntryValue | null): string | null => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return createJobPostingSchema.parse({
    title: formData.get("title"),
    company: formData.get("company"),
    description: formData.get("description"),
    type: formData.get("type"),
    locationCity: nullableText(formData.get("locationCity")),
    locationCountry: nullableText(formData.get("locationCountry")),
    isRemote: formData.get("isRemote") === "true",
    salary: nullableText(formData.get("salary")),
    applyUrl: nullableText(formData.get("applyUrl")),
    applyEmail: nullableText(formData.get("applyEmail")),
    expiresAt: formData.get("expiresAt"),
  });
}

export async function listApprovedActiveJobs(): Promise<JobPostingCardData[]> {
  const now = new Date();
  const rows = await db
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      description: jobPostings.description,
      type: jobPostings.type,
      locationCity: jobPostings.locationCity,
      locationCountry: jobPostings.locationCountry,
      isRemote: jobPostings.isRemote,
      salary: jobPostings.salary,
      applyUrl: jobPostings.applyUrl,
      applyEmail: jobPostings.applyEmail,
      postedAt: jobPostings.createdAt,
      posterClassYear: alumniProfiles.yearOfCompletion,
      posterFirstName: alumniProfiles.firstName,
      posterLastName: alumniProfiles.lastName,
      posterFallbackName: users.name,
    })
    .from(jobPostings)
    .innerJoin(users, eq(users.id, jobPostings.posterId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
    .where(
      and(
        eq(jobPostings.isApproved, true),
        eq(jobPostings.isActive, true),
        or(sql`${jobPostings.expiresAt} is null`, gt(jobPostings.expiresAt, now)),
      ),
    )
    .orderBy(desc(jobPostings.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    company: row.company,
    description: row.description,
    type: row.type,
    locationCity: row.locationCity,
    locationCountry: row.locationCountry,
    isRemote: row.isRemote,
    salary: row.salary,
    applyUrl: row.applyUrl,
    applyEmail: row.applyEmail,
    postedAt: row.postedAt,
    posterClassYear: row.posterClassYear,
    posterFullName:
      row.posterFirstName && row.posterLastName
        ? `${row.posterFirstName} ${row.posterLastName}`
        : row.posterFallbackName,
  }));
}

export async function createJobPosting(input: { posterId: string; values: JobPostingInput }) {
  const [created] = await db
    .insert(jobPostings)
    .values({
      posterId: input.posterId,
      title: input.values.title,
      company: input.values.company,
      description: input.values.description,
      type: input.values.type,
      locationCity: input.values.locationCity,
      locationCountry: input.values.locationCountry,
      isRemote: input.values.isRemote,
      salary: input.values.salary,
      applyUrl: input.values.applyUrl,
      applyEmail: input.values.applyEmail,
      expiresAt: input.values.expiresAt,
      isApproved: false,
      isActive: true,
    })
    .returning({
      id: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      expiresAt: jobPostings.expiresAt,
    });

  await notifyAdminsOfPendingJob({
    jobId: created.id,
    title: created.title,
    company: created.company,
    expiresAt: created.expiresAt,
  });

  return created;
}

async function notifyAdminsOfPendingJob(input: {
  jobId: string;
  title: string;
  company: string;
  expiresAt: Date | null;
}) {
  const admins = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.role, "admin"));

  if (admins.length === 0) {
    return;
  }

  const expiryText = input.expiresAt
    ? `Expires ${new Intl.DateTimeFormat("en-UG", { dateStyle: "medium" }).format(input.expiresAt)}.`
    : "No expiry date provided.";

  await db.insert(notifications).values(
    admins.map((admin) => ({
      userId: admin.id,
      type: "careers.job.pending_approval",
      title: "New job posting pending approval",
      body: `${input.company}: ${input.title}. ${expiryText}`,
      actionUrl: "/admin/careers",
    })),
  );
}

export async function listPendingJobPostingsForAdmin(): Promise<AdminJobPostingRow[]> {
  const rows = await db
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      type: jobPostings.type,
      locationCity: jobPostings.locationCity,
      locationCountry: jobPostings.locationCountry,
      isRemote: jobPostings.isRemote,
      createdAt: jobPostings.createdAt,
      expiresAt: jobPostings.expiresAt,
      posterName: users.name,
      posterEmail: users.email,
    })
    .from(jobPostings)
    .innerJoin(users, eq(users.id, jobPostings.posterId))
    .where(and(eq(jobPostings.isApproved, false), eq(jobPostings.isActive, true)))
    .orderBy(asc(jobPostings.createdAt));

  return rows;
}

export async function setJobPostingModerationDecision(input: {
  id: string;
  decision: "approve" | "reject";
}): Promise<JobPosting | null> {
  const [updated] = await db
    .update(jobPostings)
    .set({
      isApproved: input.decision === "approve",
      isActive: input.decision === "approve",
      updatedAt: new Date(),
    })
    .where(eq(jobPostings.id, input.id))
    .returning();

  return updated ?? null;
}

export async function expireDueJobPostings(): Promise<{ affected: number }> {
  const result = await db
    .update(jobPostings)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(jobPostings.isActive, true), isNotNull(jobPostings.expiresAt), sql`${jobPostings.expiresAt} <= now()`));

  return { affected: result.rowCount ?? 0 };
}

export async function listBusinessDirectory(input: { industry: string | null }): Promise<BusinessDirectoryItem[]> {
  const queryIndustry = input.industry?.trim() ?? "";
  const rows = await db
    .select({
      id: alumniProfiles.id,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      role: alumniProfiles.currentJobTitle,
      company: alumniProfiles.currentEmployer,
      industry: alumniProfiles.industry,
      websiteUrl: alumniProfiles.websiteUrl,
      isAvailableForMentorship: alumniProfiles.isAvailableForMentorship,
    })
    .from(alumniProfiles)
    .where(
      and(
        isNotNull(alumniProfiles.industry),
        or(isNotNull(alumniProfiles.websiteUrl), eq(alumniProfiles.isAvailableForMentorship, true)),
        queryIndustry ? ilike(alumniProfiles.industry, `%${queryIndustry}%`) : sql`true`,
      ),
    )
    .orderBy(asc(alumniProfiles.firstName), asc(alumniProfiles.lastName))
    .limit(60);

  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    role: row.role,
    company: row.company,
    industry: row.industry ?? "General",
    websiteUrl: row.websiteUrl,
    isAvailableForMentorship: row.isAvailableForMentorship,
  }));
}
