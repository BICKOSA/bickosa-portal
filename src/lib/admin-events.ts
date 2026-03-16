import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { chapters, eventRegistrations, events } from "@/lib/db/schema";
import { buildR2PublicUrl, uploadBufferToR2 } from "@/lib/r2";

export const EVENT_TYPE_OPTIONS = [
  "gala",
  "sports",
  "careers",
  "governance",
  "reunion",
  "school",
  "diaspora",
] as const;
export type EventType = (typeof EVENT_TYPE_OPTIONS)[number];

const DEFAULT_LIST_PAGE = 1;
const DEFAULT_LIST_LIMIT = 12;
const MAX_LIST_LIMIT = 50;

export type AdminEventsPublishedFilter = "all" | "published" | "draft";

export type AdminEventsListQuery = {
  page: number;
  limit: number;
  search: string;
  published: AdminEventsPublishedFilter;
};

const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only use lowercase letters, numbers, and hyphens."),
    type: z.enum(EVENT_TYPE_OPTIONS),
    startAt: z.coerce.date(),
    endAt: z.coerce.date().nullable(),
    timezone: z.string().trim().min(1),
    locationName: z.string().trim().nullable(),
    locationAddress: z.string().trim().nullable(),
    locationCity: z.string().trim().nullable(),
    isOnline: z.boolean(),
    onlineUrl: z.string().trim().url("Online URL must be valid.").nullable(),
    description: z.string().trim().nullable(),
    bannerColor: z.string().trim().nullable(),
    rsvpDeadline: z.coerce.date().nullable(),
    maxAttendees: z.number().int().positive().nullable(),
    ticketPrice: z.number().int().min(0),
    currency: z.string().trim().min(1).max(8),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
    chapterId: z.string().uuid().nullable(),
  })
  .refine((value) => !value.endAt || value.endAt >= value.startAt, {
    path: ["endAt"],
    message: "End time must be after start time.",
  })
  .refine(
    (value) =>
      !value.rsvpDeadline ||
      value.rsvpDeadline <= (value.endAt ?? new Date(value.startAt.getTime() + 24 * 60 * 60 * 1000)),
    {
      path: ["rsvpDeadline"],
      message: "RSVP deadline should not be after the event end date.",
    },
  )
  .refine((value) => !value.isOnline || Boolean(value.onlineUrl), {
    path: ["onlineUrl"],
    message: "Online URL is required when event is marked online.",
  });

export type AdminEventInput = z.infer<typeof createEventSchema>;

export type AdminEventListRow = {
  id: string;
  title: string;
  type: EventType;
  startAt: Date;
  endAt: Date | null;
  locationName: string | null;
  locationAddress: string | null;
  isOnline: boolean;
  attendeeCount: number;
  maxAttendees: number | null;
  isPublished: boolean;
  updatedAt: Date;
};

export type AdminEventsListResult = {
  data: AdminEventListRow[];
  total: number;
  page: number;
  limit: number;
  published: AdminEventsPublishedFilter;
  search: string;
};

export type AdminEventDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: EventType;
  startAt: Date;
  endAt: Date | null;
  timezone: string;
  locationName: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
  bannerKey: string | null;
  bannerUrl: string | null;
  bannerColor: string | null;
  rsvpDeadline: Date | null;
  maxAttendees: number | null;
  isFeatured: boolean;
  isPublished: boolean;
  chapterId: string | null;
  ticketPrice: number;
  currency: string;
};

export function normalizeEventSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getParam(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  if (input instanceof URLSearchParams) {
    return input.get(key);
  }

  const value = input[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function parsePublishedFilter(value: string | null): AdminEventsPublishedFilter {
  if (value === "published" || value === "draft") {
    return value;
  }
  return "all";
}

function getFormValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return false;
  }
  return value === "true" || value === "1" || value === "on";
}

function parseNullableInt(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAdminEventFormInput(formData: FormData): AdminEventInput {
  const title = getFormValue(formData, "title") ?? "";
  const slugInput = getFormValue(formData, "slug") ?? title;
  const slug = normalizeEventSlug(slugInput);
  const type = (getFormValue(formData, "type") ?? "gala") as EventType;

  const parsed = createEventSchema.parse({
    title,
    slug,
    type,
    startAt: getFormValue(formData, "startAt"),
    endAt: parseNullableDate(getFormValue(formData, "endAt")),
    timezone: getFormValue(formData, "timezone") ?? "Africa/Kampala",
    locationName: getFormValue(formData, "locationName"),
    locationAddress: getFormValue(formData, "locationAddress"),
    locationCity: getFormValue(formData, "locationCity"),
    isOnline: parseBoolean(formData, "isOnline"),
    onlineUrl: getFormValue(formData, "onlineUrl"),
    description: getFormValue(formData, "description"),
    bannerColor: getFormValue(formData, "bannerColor"),
    rsvpDeadline: parseNullableDate(getFormValue(formData, "rsvpDeadline")),
    maxAttendees: parseNullableInt(getFormValue(formData, "maxAttendees")),
    ticketPrice: parseNullableInt(getFormValue(formData, "ticketPrice")) ?? 0,
    currency: getFormValue(formData, "currency") ?? "UGX",
    isFeatured: parseBoolean(formData, "isFeatured"),
    isPublished: parseBoolean(formData, "isPublished"),
    chapterId: getFormValue(formData, "chapterId"),
  });

  return parsed;
}

export function normalizeAdminEventsListQuery(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): AdminEventsListQuery {
  const search = (getParam(input, "search") ?? "").trim().slice(0, 120);
  const page = parsePositiveInt(getParam(input, "page"), DEFAULT_LIST_PAGE);
  const requestedLimit = parsePositiveInt(getParam(input, "limit"), DEFAULT_LIST_LIMIT);
  const limit = Math.min(MAX_LIST_LIMIT, requestedLimit);
  const published = parsePublishedFilter(getParam(input, "published"));

  return {
    page,
    limit,
    search,
    published,
  };
}

export async function maybeUploadEventBanner(params: {
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

  const extension = params.file.type === "image/png" ? "png" : params.file.type === "image/webp" ? "webp" : "jpg";
  const key = `events/${params.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const body = new Uint8Array(await params.file.arrayBuffer());
  const uploaded = await uploadBufferToR2({
    key,
    body,
    contentType: params.file.type,
  });

  return uploaded.key;
}

function buildListWhere(query: AdminEventsListQuery): SQL | undefined {
  const whereParts: SQL[] = [];

  if (query.search) {
    const searchTerm = `%${query.search}%`;
    whereParts.push(
      or(ilike(events.title, searchTerm), ilike(events.slug, searchTerm), ilike(events.locationName, searchTerm)) as SQL,
    );
  }

  if (query.published === "published") {
    whereParts.push(eq(events.isPublished, true));
  } else if (query.published === "draft") {
    whereParts.push(eq(events.isPublished, false));
  }

  if (whereParts.length === 0) {
    return undefined;
  }

  return and(...whereParts) as SQL;
}

export async function listAdminEvents(query: AdminEventsListQuery): Promise<AdminEventsListResult> {
  const where = buildListWhere(query);
  const offset = (query.page - 1) * query.limit;
  const attendeeCounts = db.$with("event_attendee_counts").as(
    db
      .select({
        eventId: eventRegistrations.eventId,
        attendeeCount: sql<number>`count(*)::int`,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.status, "attending"))
      .groupBy(eventRegistrations.eventId),
  );

  const [countRow] = await db
    .select({
      value: sql<number>`count(*)::int`,
    })
    .from(events)
    .where(where);

  const data = await db
    .with(attendeeCounts)
    .select({
      id: events.id,
      title: events.title,
      type: events.type,
      startAt: events.startAt,
      endAt: events.endAt,
      locationName: events.locationName,
      locationAddress: events.locationAddress,
      isOnline: events.isOnline,
      attendeeCount: sql<number>`coalesce(${attendeeCounts.attendeeCount}, 0)::int`,
      maxAttendees: events.maxAttendees,
      isPublished: events.isPublished,
      updatedAt: events.updatedAt,
    })
    .from(events)
    .leftJoin(attendeeCounts, eq(attendeeCounts.eventId, events.id))
    .where(where)
    .orderBy(desc(events.startAt), asc(events.title))
    .limit(query.limit)
    .offset(offset);

  return {
    data,
    total: countRow?.value ?? 0,
    page: query.page,
    limit: query.limit,
    published: query.published,
    search: query.search,
  };
}

export async function getAdminEventById(id: string): Promise<AdminEventDetail | null> {
  const [row] = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      description: events.description,
      type: events.type,
      startAt: events.startAt,
      endAt: events.endAt,
      timezone: events.timezone,
      locationName: events.locationName,
      locationAddress: events.locationAddress,
      locationCity: events.locationCity,
      isOnline: events.isOnline,
      onlineUrl: events.onlineUrl,
      bannerKey: events.bannerKey,
      bannerColor: events.bannerColor,
      rsvpDeadline: events.rsvpDeadline,
      maxAttendees: events.maxAttendees,
      isFeatured: events.isFeatured,
      isPublished: events.isPublished,
      chapterId: events.chapterId,
      ticketPrice: events.ticketPrice,
      currency: events.currency,
    })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    bannerUrl: row.bannerKey ? buildR2PublicUrl(row.bannerKey) : null,
  };
}

export async function listChapterOptions() {
  return db
    .select({
      id: chapters.id,
      name: chapters.name,
    })
    .from(chapters)
    .where(eq(chapters.isActive, true))
    .orderBy(asc(chapters.name));
}

export async function ensureEventExistsForAdmin(id: string): Promise<boolean> {
  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    columns: { id: true },
  });
  return Boolean(event);
}

export async function cancelRegistrationsForEvent(eventId: string): Promise<void> {
  await db
    .update(eventRegistrations)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "attending")));
}

export async function isEventSlugAvailable(params: {
  slug: string;
  excludeEventId?: string | null;
}): Promise<boolean> {
  const normalized = normalizeEventSlug(params.slug);
  if (!normalized) {
    return false;
  }

  const existing = await db.query.events.findFirst({
    where:
      params.excludeEventId && params.excludeEventId.length > 0
        ? and(eq(events.slug, normalized), ne(events.id, params.excludeEventId))
        : eq(events.slug, normalized),
    columns: { id: true },
  });

  return !existing;
}

export async function archiveEventById(eventId: string): Promise<void> {
  await cancelRegistrationsForEvent(eventId);
  await db
    .update(events)
    .set({
      isPublished: false,
      rsvpDeadline: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));
}
