import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  chapters,
  eventRegistrations,
  events,
  privacySettings,
  users,
  type Event,
} from "@/lib/db/schema";
import { buildR2PublicUrl } from "@/lib/r2";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const MAX_SEARCH_LENGTH = 100;

const EVENT_TYPES = [
  "gala",
  "sports",
  "careers",
  "governance",
  "reunion",
  "school",
  "diaspora",
] as const;

export type EventTab = "upcoming" | "mine" | "past";
export type EventType = (typeof EVENT_TYPES)[number];
export type EventRegistrationStatus = "attending" | "waitlisted" | "cancelled" | null;

export type EventAttendeePreview = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export type EventCardData = {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  startAt: Date;
  endAt: Date | null;
  locationName: string | null;
  locationAddress: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
  bannerColor: string | null;
  bannerUrl: string | null;
  maxAttendees: number | null;
  attendeeCount: number;
  rsvpDeadline: Date | null;
  registrationStatus: EventRegistrationStatus;
  attendeePreview: EventAttendeePreview[];
};

export type EventListResult = {
  data: EventCardData[];
  total: number;
  page: number;
  limit: number;
};

export type EventQuery = {
  tab: EventTab;
  page: number;
  limit: number;
  search: string;
  type: EventType | null;
};

export type EventAttendee = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
};

export type EventDetailData = {
  id: string;
  slug: string;
  title: string;
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
  bannerColor: string | null;
  bannerUrl: string | null;
  rsvpDeadline: Date | null;
  maxAttendees: number | null;
  attendeeCount: number;
  registrationStatus: EventRegistrationStatus;
  organizerName: string;
  chapterName: string | null;
  ticketPrice: number;
  currency: string;
  attendees: EventAttendee[];
  relatedEvents: EventCardData[];
};

type QueryInput = URLSearchParams | Record<string, string | string[] | undefined>;

function getParam(input: QueryInput, key: string): string | null {
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

function parseTab(value: string | null): EventTab {
  if (value === "mine" || value === "past") {
    return value;
  }
  return "upcoming";
}

function parseType(value: string | null): EventType | null {
  if (!value) {
    return null;
  }
  return EVENT_TYPES.includes(value as EventType) ? (value as EventType) : null;
}

function buildWhereClause(query: EventQuery, userId: string): {
  where: SQL;
  userRegistrationSubquery: ReturnType<typeof db.$with>;
} {
  const now = new Date();
  const userRegistrationSubquery = db.$with("user_event_registrations").as(
    db
      .select({
        eventId: eventRegistrations.eventId,
        status: eventRegistrations.status,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId)),
  );

  const conditions: SQL[] = [eq(events.isPublished, true)];

  if (query.tab === "upcoming") {
    conditions.push(gt(events.startAt, now));
  } else if (query.tab === "past") {
    conditions.push(lt(sql`coalesce(${events.endAt}, ${events.startAt})`, now));
  } else {
    conditions.push(isNotNull(userRegistrationSubquery.eventId));
  }

  if (query.search) {
    const searchTerm = `%${query.search}%`;
    conditions.push(
      sql`(${events.title} ilike ${searchTerm} or ${events.locationName} ilike ${searchTerm})`,
    );
  }

  if (query.type) {
    conditions.push(eq(events.type, query.type));
  }

  return {
    where: and(...conditions) as SQL,
    userRegistrationSubquery,
  };
}

function mapEventCardRow(row: {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  startAt: Date;
  endAt: Date | null;
  locationName: string | null;
  locationAddress: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
  bannerColor: string | null;
  bannerKey: string | null;
  maxAttendees: number | null;
  attendeeCount: number;
  rsvpDeadline: Date | null;
  registrationStatus: EventRegistrationStatus;
}): EventCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    startAt: row.startAt,
    endAt: row.endAt,
    locationName: row.locationName,
    locationAddress: row.locationAddress,
    isOnline: row.isOnline,
    onlineUrl: row.onlineUrl,
    bannerColor: row.bannerColor,
    bannerUrl: row.bannerKey ? buildR2PublicUrl(row.bannerKey) : null,
    maxAttendees: row.maxAttendees,
    attendeeCount: row.attendeeCount,
    rsvpDeadline: row.rsvpDeadline,
    registrationStatus: row.registrationStatus,
    attendeePreview: [],
  };
}

export function normalizeEventsQuery(input: QueryInput): EventQuery {
  const tab = parseTab(getParam(input, "tab"));
  const page = parsePositiveInt(getParam(input, "page"), DEFAULT_PAGE);
  const requestedLimit = parsePositiveInt(getParam(input, "limit"), DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, requestedLimit);
  const search = (getParam(input, "search") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  const type = parseType(getParam(input, "type"));

  return {
    tab,
    page,
    limit,
    search,
    type,
  };
}

export function formatEventTypeLabel(type: EventType): string {
  switch (type) {
    case "gala":
      return "Gala";
    case "sports":
      return "Sports";
    case "careers":
      return "Careers";
    case "governance":
      return "Governance";
    case "reunion":
      return "Reunion";
    case "school":
      return "School";
    case "diaspora":
      return "Diaspora";
    default:
      return "Event";
  }
}

export async function listEventsForViewer(params: {
  userId: string;
  query: EventQuery;
}): Promise<EventListResult> {
  const { userId, query } = params;
  const { where, userRegistrationSubquery } = buildWhereClause(query, userId);
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
    .with(userRegistrationSubquery)
    .select({
      value: sql<number>`count(*)::int`,
    })
    .from(events)
    .leftJoin(userRegistrationSubquery, eq(userRegistrationSubquery.eventId, events.id))
    .where(where);

  const rows = await db
    .with(userRegistrationSubquery, attendeeCounts)
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      type: events.type,
      startAt: events.startAt,
      endAt: events.endAt,
      locationName: events.locationName,
      locationAddress: events.locationAddress,
      isOnline: events.isOnline,
      onlineUrl: events.onlineUrl,
      bannerColor: events.bannerColor,
      bannerKey: events.bannerKey,
      maxAttendees: events.maxAttendees,
      attendeeCount: sql<number>`coalesce(${attendeeCounts.attendeeCount}, 0)::int`,
      rsvpDeadline: events.rsvpDeadline,
      registrationStatus: userRegistrationSubquery.status,
    })
    .from(events)
    .leftJoin(userRegistrationSubquery, eq(userRegistrationSubquery.eventId, events.id))
    .leftJoin(attendeeCounts, eq(attendeeCounts.eventId, events.id))
    .where(where)
    .orderBy(query.tab === "past" ? desc(events.startAt) : asc(events.startAt))
    .limit(query.limit)
    .offset(offset);

  const eventCards = rows.map(mapEventCardRow);
  const previews = await getEventAttendeePreviews(eventCards.map((event) => event.id));

  const data = eventCards.map((event) => ({
    ...event,
    attendeePreview: previews.get(event.id) ?? [],
  }));

  return {
    data,
    total: countRow?.value ?? 0,
    page: query.page,
    limit: query.limit,
  };
}

async function getEventAttendeePreviews(
  eventIds: string[],
): Promise<Map<string, EventAttendeePreview[]>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const previewRows = await db.execute<{
    eventId: string;
    userId: string;
    name: string;
    avatarKey: string | null;
  }>(sql`
    select
      ranked.event_id as "eventId",
      ranked.user_id as "userId",
      ranked.name as "name",
      ranked.avatar_key as "avatarKey"
    from (
      select
        er.event_id,
        u.id as user_id,
        coalesce(ap.first_name || ' ' || ap.last_name, u.name) as name,
        ap.avatar_key,
        row_number() over (
          partition by er.event_id
          order by er.created_at desc
        ) as row_number
      from event_registrations er
      inner join users u on u.id = er.user_id
      left join alumni_profiles ap on ap.user_id = u.id
      where er.status = 'attending'
        and er.event_id in (${sql.join(
          eventIds.map((eventId) => sql`${eventId}`),
          sql`, `,
        )})
    ) ranked
    where ranked.row_number <= 3
    order by ranked.event_id, ranked.row_number
  `);

  const grouped = new Map<string, EventAttendeePreview[]>();
  for (const row of previewRows.rows) {
    const current = grouped.get(row.eventId) ?? [];
    current.push({
      userId: row.userId,
      name: row.name,
      avatarUrl: row.avatarKey ? buildR2PublicUrl(row.avatarKey) : null,
    });
    grouped.set(row.eventId, current);
  }

  return grouped;
}

export async function getEventDetailBySlug(params: {
  slug: string;
  userId: string;
}): Promise<EventDetailData | null> {
  const userRegistrationSubquery = db.$with("event_user_registration").as(
    db
      .select({
        eventId: eventRegistrations.eventId,
        status: eventRegistrations.status,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, params.userId)),
  );

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

  const [eventRow] = await db
    .with(userRegistrationSubquery, attendeeCounts)
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
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
      bannerColor: events.bannerColor,
      bannerKey: events.bannerKey,
      rsvpDeadline: events.rsvpDeadline,
      maxAttendees: events.maxAttendees,
      attendeeCount: sql<number>`coalesce(${attendeeCounts.attendeeCount}, 0)::int`,
      registrationStatus: userRegistrationSubquery.status,
      organizerName: users.name,
      chapterName: chapters.name,
      ticketPrice: events.ticketPrice,
      currency: events.currency,
    })
    .from(events)
    .innerJoin(users, eq(users.id, events.organizerId))
    .leftJoin(chapters, eq(chapters.id, events.chapterId))
    .leftJoin(userRegistrationSubquery, eq(userRegistrationSubquery.eventId, events.id))
    .leftJoin(attendeeCounts, eq(attendeeCounts.eventId, events.id))
    .where(and(eq(events.slug, params.slug), eq(events.isPublished, true)))
    .limit(1);

  if (!eventRow) {
    return null;
  }

  const attendeeRows = await db
    .select({
      userId: users.id,
      fallbackName: users.name,
      firstName: alumniProfiles.firstName,
      lastName: alumniProfiles.lastName,
      avatarKey: alumniProfiles.avatarKey,
      showInDirectory: privacySettings.showInDirectory,
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(users.id, eventRegistrations.userId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
    .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
    .where(
      and(eq(eventRegistrations.eventId, eventRow.id), eq(eventRegistrations.status, "attending")),
    )
    .orderBy(desc(eventRegistrations.createdAt))
    .limit(24);

  const attendees: EventAttendee[] = attendeeRows.map((attendee) => {
    const isPublic = attendee.showInDirectory ?? true;
    const fullName =
      attendee.firstName && attendee.lastName
        ? `${attendee.firstName} ${attendee.lastName}`
        : attendee.fallbackName;

    return {
      userId: attendee.userId,
      name: isPublic ? fullName : null,
      avatarUrl: isPublic && attendee.avatarKey ? buildR2PublicUrl(attendee.avatarKey) : null,
      isPublic,
    };
  });

  const related = await listEventsForViewer({
    userId: params.userId,
    query: {
      tab: "upcoming",
      page: 1,
      limit: 4,
      search: "",
      type: eventRow.type,
    },
  });

  const relatedEvents = related.data.filter((event) => event.id !== eventRow.id);

  return {
    id: eventRow.id,
    slug: eventRow.slug,
    title: eventRow.title,
    description: eventRow.description,
    type: eventRow.type,
    startAt: eventRow.startAt,
    endAt: eventRow.endAt,
    timezone: eventRow.timezone,
    locationName: eventRow.locationName,
    locationAddress: eventRow.locationAddress,
    locationCity: eventRow.locationCity,
    isOnline: eventRow.isOnline,
    onlineUrl: eventRow.onlineUrl,
    bannerColor: eventRow.bannerColor,
    bannerUrl: eventRow.bannerKey ? buildR2PublicUrl(eventRow.bannerKey) : null,
    rsvpDeadline: eventRow.rsvpDeadline,
    maxAttendees: eventRow.maxAttendees,
    attendeeCount: eventRow.attendeeCount,
    registrationStatus: eventRow.registrationStatus,
    organizerName: eventRow.organizerName,
    chapterName: eventRow.chapterName,
    ticketPrice: eventRow.ticketPrice,
    currency: eventRow.currency,
    attendees,
    relatedEvents,
  };
}

export async function getEventForRsvpValidation(eventId: string): Promise<{
  event: Event | null;
  attendeeCount: number;
}> {
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

  const [row] = await db
    .with(attendeeCounts)
    .select({
      event: events,
      attendeeCount: sql<number>`coalesce(${attendeeCounts.attendeeCount}, 0)::int`,
    })
    .from(events)
    .leftJoin(attendeeCounts, eq(attendeeCounts.eventId, events.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!row) {
    return { event: null, attendeeCount: 0 };
  }

  return { event: row.event, attendeeCount: row.attendeeCount };
}

export async function getEventsByIdsForReminder(eventIds: string[]) {
  if (eventIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: events.id,
      title: events.title,
      startAt: events.startAt,
      endAt: events.endAt,
      locationName: events.locationName,
      locationAddress: events.locationAddress,
      isOnline: events.isOnline,
      onlineUrl: events.onlineUrl,
      timezone: events.timezone,
      slug: events.slug,
    })
    .from(events)
    .where(inArray(events.id, eventIds));
}

function toCalendarDateTime(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(input: {
  title: string;
  startAt: Date;
  endAt: Date | null;
  description: string | null;
  location: string | null;
}): string {
  const endAt = input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000);

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", `${toCalendarDateTime(input.startAt)}/${toCalendarDateTime(endAt)}`);
  if (input.description) {
    url.searchParams.set("details", input.description);
  }
  if (input.location) {
    url.searchParams.set("location", input.location);
  }

  return url.toString();
}

export function buildIcsContent(input: {
  eventId: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  description: string | null;
  location: string | null;
  sourceUrl: string;
}): string {
  const endAt = input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BICKOSA//Alumni Portal//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.eventId}@portal.bickosa.org`,
    `DTSTAMP:${toCalendarDateTime(new Date())}`,
    `DTSTART:${toCalendarDateTime(input.startAt)}`,
    `DTEND:${toCalendarDateTime(endAt)}`,
    `SUMMARY:${input.title.replace(/\n/g, " ")}`,
    `DESCRIPTION:${(input.description ?? "").replace(/\n/g, "\\n")}`,
    `LOCATION:${(input.location ?? "").replace(/\n/g, " ")}`,
    `URL:${input.sourceUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export function getEventCalendarLocation(event: {
  locationName: string | null;
  locationAddress: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
}): string | null {
  if (event.isOnline && event.onlineUrl) {
    return event.onlineUrl;
  }

  if (event.locationName && event.locationAddress) {
    return `${event.locationName}, ${event.locationAddress}`;
  }

  return event.locationName ?? event.locationAddress ?? null;
}

export function isEventPast(event: {
  startAt: Date;
  endAt: Date | null;
}): boolean {
  const now = Date.now();
  const ending = (event.endAt ?? event.startAt).getTime();
  return ending < now;
}

export function isRsvpDeadlinePassed(deadline: Date | null): boolean {
  if (!deadline) {
    return false;
  }
  return deadline.getTime() < Date.now();
}

export function isEventFull(attendeeCount: number, maxAttendees: number | null): boolean {
  if (!maxAttendees || maxAttendees <= 0) {
    return false;
  }
  return attendeeCount >= maxAttendees;
}

export async function getUserBasicProfile(userId: string): Promise<{
  firstName: string;
  email: string;
  receiveEventReminders: boolean;
} | null> {
  const [row] = await db
    .select({
      firstName: alumniProfiles.firstName,
      email: users.email,
      receiveEventReminders: privacySettings.receiveEventReminders,
    })
    .from(users)
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
    .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    firstName: row.firstName ?? "Member",
    email: row.email,
    receiveEventReminders: row.receiveEventReminders ?? true,
  };
}

export async function listUsersForEventReminder(eventId: string): Promise<string[]> {
  const rows = await db
    .select({
      userId: eventRegistrations.userId,
    })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "attending")));

  return rows.map((row) => row.userId);
}

export async function listUpcomingEvents(limit = 6): Promise<
  Array<{
    id: string;
    slug: string;
    title: string;
    startAt: Date;
  }>
> {
  const now = new Date();
  return db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      startAt: events.startAt,
    })
    .from(events)
    .where(and(eq(events.isPublished, true), gt(events.startAt, now)))
    .orderBy(asc(events.startAt))
    .limit(limit);
}
