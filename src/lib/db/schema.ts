import { sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
]);

export const membershipTierEnum = pgEnum("membership_tier", [
  "standard",
  "lifetime",
]);

export const verificationActionEnum = pgEnum("verification_action", [
  "submitted",
  "approved",
  "rejected",
  "suspended",
]);

export const consentTypeEnum = pgEnum("consent_type", [
  "directory",
  "marketing",
  "photography",
  "data_processing",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "gala",
  "sports",
  "careers",
  "governance",
  "reunion",
  "school",
  "diaspora",
]);

export const eventRegistrationStatusEnum = pgEnum("event_registration_status", [
  "attending",
  "waitlisted",
  "cancelled",
]);

export const campaignProjectTypeEnum = pgEnum("campaign_project_type", [
  "academic_block",
  "ict_lab",
  "scholarship",
  "sports",
  "general",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "mtn_momo",
  "airtel_money",
  "visa",
  "mastercard",
  "bank_transfer",
  "other",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const sportTypeEnum = pgEnum("sport_type", [
  "football",
  "basketball",
  "netball",
  "volleyball",
]);

export const fixtureStatusEnum = pgEnum("fixture_status", [
  "scheduled",
  "in_progress",
  "completed",
  "postponed",
]);

export const mentorshipStatusEnum = pgEnum("mentorship_status", [
  "pending",
  "accepted",
  "declined",
  "completed",
  "cancelled",
]);
export const mentorshipContactMethodEnum = pgEnum("mentorship_contact_method", [
  "email",
  "scheduling_link",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "fulltime",
  "parttime",
  "contract",
  "internship",
  "volunteer",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "constitution",
  "annual_report",
  "financial",
  "minutes",
  "policy",
  "other",
]);

export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);
export const deletionRequestStatusEnum = pgEnum("deletion_request_status", [
  "pending",
  "processing",
  "completed",
  "rejected",
]);
export const electionCycleStatusEnum = pgEnum("election_cycle_status", [
  "draft",
  "nominations_open",
  "nominations_closed",
  "voting_open",
  "voting_closed",
  "results_published",
]);
export const nominationStatusEnum = pgEnum("nomination_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);
export const pollTypeEnum = pgEnum("poll_type", [
  "yes_no_abstain",
  "multiple_choice",
  "ranked_choice",
]);
export const pollStatusEnum = pgEnum("poll_status", [
  "draft",
  "open",
  "closed",
  "results_published",
]);
export const pollTargetAudienceEnum = pgEnum("poll_target_audience", [
  "all_members",
  "verified_only",
  "chapter",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("member").notNull(),
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  impersonatedBy: uuid("impersonated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerAccountUnique: uniqueIndex("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  }),
);

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chapters = pgTable("chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  country: varchar("country", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }),
  region: varchar("region", { length: 100 }),
  leaderId: uuid("leader_id").references(() => users.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").default(true).notNull(),
  foundedYear: integer("founded_year"),
  memberCount: integer("member_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const alumniProfiles = pgTable("alumni_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  yearOfEntry: integer("year_of_entry"),
  yearOfCompletion: integer("year_of_completion"),
  currentJobTitle: varchar("current_job_title", { length: 255 }),
  currentEmployer: varchar("current_employer", { length: 255 }),
  industry: varchar("industry", { length: 120 }),
  locationCity: varchar("location_city", { length: 120 }),
  locationCountry: varchar("location_country", { length: 120 }),
  phone: varchar("phone", { length: 32 }),
  bio: text("bio"),
  linkedinUrl: text("linkedin_url"),
  websiteUrl: text("website_url"),
  avatarKey: text("avatar_key"),
  verificationStatus: verificationStatusEnum("verification_status")
    .default("pending")
    .notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedById: uuid("verified_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  membershipTier: membershipTierEnum("membership_tier")
    .default("standard")
    .notNull(),
  membershipExpiresAt: timestamp("membership_expires_at", { withTimezone: true }),
  chapterId: uuid("chapter_id").references(() => chapters.id, {
    onDelete: "set null",
  }),
  isAvailableForMentorship: boolean("is_available_for_mentorship")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const verificationEvents = pgTable("verification_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  alumniProfileId: uuid("alumni_profile_id")
    .notNull()
    .references(() => alumniProfiles.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: verificationActionEnum("action").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const consentLogs = pgTable("consent_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  consentType: consentTypeEnum("consent_type").notNull(),
  granted: boolean("granted").notNull(),
  action: varchar("action", { length: 64 }),
  resourceType: varchar("resource_type", { length: 64 }),
  resourceId: uuid("resource_id"),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const privacySettings = pgTable("privacy_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  showInDirectory: boolean("show_in_directory").default(true).notNull(),
  showEmail: boolean("show_email").default(false).notNull(),
  showPhone: boolean("show_phone").default(false).notNull(),
  showEmployer: boolean("show_employer").default(true).notNull(),
  availableForMentorship: boolean("available_for_mentorship")
    .default(false)
    .notNull(),
  showOnDonorWall: boolean("show_on_donor_wall").default(true).notNull(),
  receiveEventReminders: boolean("receive_event_reminders").default(true).notNull(),
  receiveNewsletter: boolean("receive_newsletter").default(true).notNull(),
  receiveMentorshipNotifications: boolean("receive_mentorship_notifications")
    .default(true)
    .notNull(),
  receiveDonationCampaignUpdates: boolean("receive_donation_campaign_updates")
    .default(true)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const deletionRequests = pgTable("deletion_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  status: deletionRequestStatusEnum("status").default("pending").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  notes: text("notes"),
});

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  type: eventTypeEnum("type").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  timezone: varchar("timezone", { length: 120 }).default("Africa/Kampala").notNull(),
  locationName: varchar("location_name", { length: 255 }),
  locationAddress: text("location_address"),
  locationCity: varchar("location_city", { length: 120 }),
  isOnline: boolean("is_online").default(false).notNull(),
  onlineUrl: text("online_url"),
  bannerKey: text("banner_key"),
  bannerColor: varchar("banner_color", { length: 16 }),
  rsvpDeadline: timestamp("rsvp_deadline", { withTimezone: true }),
  maxAttendees: integer("max_attendees"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  organizerId: uuid("organizer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id").references(() => chapters.id, {
    onDelete: "set null",
  }),
  ticketPrice: integer("ticket_price").default(0).notNull(),
  currency: varchar("currency", { length: 8 }).default("UGX").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: eventRegistrationStatusEnum("status").notNull(),
    ticketRef: varchar("ticket_ref", { length: 255 }).unique(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    paymentRef: varchar("payment_ref", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    eventUserUnique: uniqueIndex("event_registrations_event_user_unique").on(
      table.eventId,
      table.userId,
    ),
  }),
);

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  projectType: campaignProjectTypeEnum("project_type").notNull(),
  goalAmount: bigint("goal_amount", { mode: "bigint" }).notNull(),
  raisedAmount: bigint("raised_amount", { mode: "bigint" })
    .default(sql`0`)
    .notNull(),
  currency: varchar("currency", { length: 8 }).default("UGX").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  isActive: boolean("is_active").default(false).notNull(),
  bannerKey: text("banner_key"),
  bannerColor: varchar("banner_color", { length: 16 }),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const donations = pgTable("donations", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  amount: bigint("amount", { mode: "bigint" }).notNull(),
  currency: varchar("currency", { length: 8 }).default("UGX").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentRef: varchar("payment_ref", { length: 255 }).notNull().unique(),
  paymentStatus: paymentStatusEnum("payment_status").notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  donorName: varchar("donor_name", { length: 255 }),
  donorEmail: varchar("donor_email", { length: 255 }),
  receiptSentAt: timestamp("receipt_sent_at", { withTimezone: true }),
  receiptRef: varchar("receipt_ref", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const campaignUpdates = pgTable("campaign_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sportsSeasons = pgTable("sports_seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  year: integer("year").notNull(),
  sport: sportTypeEnum("sport").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sportsTeams = pgTable("sports_teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  abbreviation: varchar("abbreviation", { length: 4 }).notNull(),
  badgeColor: varchar("badge_color", { length: 16 }),
  badgeKey: text("badge_key"),
  captainId: uuid("captain_id").references(() => users.id, {
    onDelete: "set null",
  }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => sportsSeasons.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sportsFixtures = pgTable("sports_fixtures", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => sportsSeasons.id, { onDelete: "cascade" }),
  homeTeamId: uuid("home_team_id")
    .notNull()
    .references(() => sportsTeams.id, { onDelete: "cascade" }),
  awayTeamId: uuid("away_team_id")
    .notNull()
    .references(() => sportsTeams.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  venue: varchar("venue", { length: 255 }),
  status: fixtureStatusEnum("status").default("scheduled").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  matchweek: integer("matchweek"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sportsPlayerStats = pgTable(
  "sports_player_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => sportsSeasons.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => sportsTeams.id, { onDelete: "cascade" }),
    goals: integer("goals").default(0).notNull(),
    assists: integer("assists").default(0).notNull(),
    appearances: integer("appearances").default(0).notNull(),
    yellowCards: integer("yellow_cards").default(0).notNull(),
    redCards: integer("red_cards").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    seasonPlayerUnique: uniqueIndex("sports_player_stats_season_player_unique").on(
      table.seasonId,
      table.playerId,
    ),
  }),
);

export const mentorshipRequests = pgTable("mentorship_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  menteeId: uuid("mentee_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: mentorshipStatusEnum("status").default("pending").notNull(),
  field: varchar("field", { length: 255 }),
  message: text("message"),
  mentorResponse: text("mentor_response"),
  schedulingUrl: text("scheduling_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export const mentorshipPreferences = pgTable(
  "mentorship_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    isAvailable: boolean("is_available").default(false).notNull(),
    focusAreas: text("focus_areas").array().default(sql`ARRAY[]::text[]`).notNull(),
    maxMentees: integer("max_mentees").default(1).notNull(),
    contactMethod: mentorshipContactMethodEnum("contact_method").default("email").notNull(),
    schedulingUrl: text("scheduling_url"),
    mentorshipBio: varchar("mentorship_bio", { length: 280 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

export const jobPostings = pgTable("job_postings", {
  id: uuid("id").defaultRandom().primaryKey(),
  posterId: uuid("poster_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  description: text("description").notNull(),
  type: jobTypeEnum("type").notNull(),
  locationCity: varchar("location_city", { length: 120 }),
  locationCountry: varchar("location_country", { length: 120 }),
  isRemote: boolean("is_remote").default(false).notNull(),
  salary: text("salary"),
  applyUrl: text("apply_url"),
  applyEmail: varchar("apply_email", { length: 255 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isApproved: boolean("is_approved").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: documentCategoryEnum("category").notNull(),
  fileKey: text("file_key").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  year: integer("year"),
  uploadedById: uuid("uploaded_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const documentDownloadLogs = pgTable("document_download_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  downloadedByUserId: uuid("downloaded_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 120 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  actionUrl: text("action_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const portalAnalyticsEvents = pgTable("portal_analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventName: varchar("event_name", { length: 120 }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  properties: jsonb("properties").$type<Record<string, string | number | boolean | null>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notificationDispatchLog = pgTable(
  "notification_dispatch_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 120 }).notNull(),
    notificationId: uuid("notification_id").references(() => notifications.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idempotencyKeyUnique: uniqueIndex("notification_dispatch_log_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
  }),
);

export const electionCycles = pgTable(
  "election_cycles",
  {
    id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    nominationOpens: timestamp("nomination_opens", { withTimezone: true }).notNull(),
    nominationCloses: timestamp("nomination_closes", { withTimezone: true }).notNull(),
    votingOpens: timestamp("voting_opens", { withTimezone: true }).notNull(),
    votingCloses: timestamp("voting_closes", { withTimezone: true }).notNull(),
    resultsPublished: boolean("results_published").default(false).notNull(),
    status: electionCycleStatusEnum("status").default("draft").notNull(),
    quorumPercent: integer("quorum_percent").default(25).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("election_cycles_status_idx").on(table.status),
  }),
);

export const electionPositions = pgTable("election_positions", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey(),
  electionCycleId: uuid("election_cycle_id")
    .notNull()
    .references(() => electionCycles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  maxWinners: integer("max_winners").default(1).notNull(),
  maxNominations: integer("max_nominations").default(10).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const nominations = pgTable(
  "nominations",
  {
    id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey(),
    electionCycleId: uuid("election_cycle_id")
      .notNull()
      .references(() => electionCycles.id, { onDelete: "cascade" }),
    positionId: uuid("position_id")
      .notNull()
      .references(() => electionPositions.id, { onDelete: "cascade" }),
    nomineeId: uuid("nominee_id")
      .notNull()
      .references(() => users.id),
    nominatedById: uuid("nominated_by_id")
      .notNull()
      .references(() => users.id),
    manifesto: text("manifesto"),
    status: nominationStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    positionNomineeUnique: uniqueIndex("nominations_position_nominee_unique").on(
      table.positionId,
      table.nomineeId,
    ),
    cycleStatusIdx: index("nominations_election_cycle_status_idx").on(
      table.electionCycleId,
      table.status,
    ),
    nomineeIdx: index("nominations_nominee_id_idx").on(table.nomineeId),
  }),
);

export const electionVotes = pgTable(
  "election_votes",
  {
    id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey(),
    electionCycleId: uuid("election_cycle_id")
      .notNull()
      .references(() => electionCycles.id, { onDelete: "cascade" }),
    positionId: uuid("position_id")
      .notNull()
      .references(() => electionPositions.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => users.id),
    nomineeId: uuid("nominee_id")
      .notNull()
      .references(() => nominations.id),
    castAt: timestamp("cast_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    positionVoterUnique: uniqueIndex("election_votes_position_voter_unique").on(
      table.positionId,
      table.voterId,
    ),
    cycleVoterIdx: index("election_votes_election_cycle_voter_idx").on(
      table.electionCycleId,
      table.voterId,
    ),
  }),
);

export const generalPolls = pgTable(
  "general_polls",
  {
    id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    pollType: pollTypeEnum("poll_type").default("yes_no_abstain").notNull(),
    options: jsonb("options").$type<string[] | null>(),
    isAnonymous: boolean("is_anonymous").default(false).notNull(),
    votingOpens: timestamp("voting_opens", { withTimezone: true }).notNull(),
    votingCloses: timestamp("voting_closes", { withTimezone: true }).notNull(),
    quorumPercent: integer("quorum_percent").default(10).notNull(),
    resultsPublished: boolean("results_published").default(false).notNull(),
    status: pollStatusEnum("status").default("draft").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    targetAudience: pollTargetAudienceEnum("target_audience").default("verified_only").notNull(),
    chapterId: uuid("chapter_id").references(() => chapters.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("general_polls_status_idx").on(table.status),
    votingWindowIdx: index("general_polls_voting_window_idx").on(
      table.votingOpens,
      table.votingCloses,
    ),
  }),
);

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => generalPolls.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => users.id),
    choice: jsonb("choice").$type<string | string[]>().notNull(),
    castAt: timestamp("cast_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pollVoterUnique: uniqueIndex("poll_votes_poll_voter_unique").on(table.pollId, table.voterId),
    pollIdIdx: index("poll_votes_poll_id_idx").on(table.pollId),
  }),
);

export const governanceAppointments = pgTable("governance_appointments", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  position: text("position").notNull(),
  termStart: date("term_start").notNull(),
  termEnd: date("term_end"),
  isCurrent: boolean("is_current").default(true).notNull(),
  appointedBy: uuid("appointed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;
export type Verification = InferSelectModel<typeof verifications>;
export type NewVerification = InferInsertModel<typeof verifications>;
export type AlumniProfile = InferSelectModel<typeof alumniProfiles>;
export type NewAlumniProfile = InferInsertModel<typeof alumniProfiles>;
export type VerificationEvent = InferSelectModel<typeof verificationEvents>;
export type NewVerificationEvent = InferInsertModel<typeof verificationEvents>;
export type ConsentLog = InferSelectModel<typeof consentLogs>;
export type NewConsentLog = InferInsertModel<typeof consentLogs>;
export type PrivacySettings = InferSelectModel<typeof privacySettings>;
export type NewPrivacySettings = InferInsertModel<typeof privacySettings>;
export type Chapter = InferSelectModel<typeof chapters>;
export type NewChapter = InferInsertModel<typeof chapters>;
export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;
export type EventRegistration = InferSelectModel<typeof eventRegistrations>;
export type NewEventRegistration = InferInsertModel<typeof eventRegistrations>;
export type Campaign = InferSelectModel<typeof campaigns>;
export type NewCampaign = InferInsertModel<typeof campaigns>;
export type Donation = InferSelectModel<typeof donations>;
export type NewDonation = InferInsertModel<typeof donations>;
export type CampaignUpdate = InferSelectModel<typeof campaignUpdates>;
export type NewCampaignUpdate = InferInsertModel<typeof campaignUpdates>;
export type SportsSeason = InferSelectModel<typeof sportsSeasons>;
export type NewSportsSeason = InferInsertModel<typeof sportsSeasons>;
export type SportsTeam = InferSelectModel<typeof sportsTeams>;
export type NewSportsTeam = InferInsertModel<typeof sportsTeams>;
export type SportsFixture = InferSelectModel<typeof sportsFixtures>;
export type NewSportsFixture = InferInsertModel<typeof sportsFixtures>;
export type SportsPlayerStat = InferSelectModel<typeof sportsPlayerStats>;
export type NewSportsPlayerStat = InferInsertModel<typeof sportsPlayerStats>;
export type MentorshipRequest = InferSelectModel<typeof mentorshipRequests>;
export type NewMentorshipRequest = InferInsertModel<typeof mentorshipRequests>;
export type MentorshipPreference = InferSelectModel<typeof mentorshipPreferences>;
export type NewMentorshipPreference = InferInsertModel<typeof mentorshipPreferences>;
export type JobPosting = InferSelectModel<typeof jobPostings>;
export type NewJobPosting = InferInsertModel<typeof jobPostings>;
export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;
export type DocumentDownloadLog = InferSelectModel<typeof documentDownloadLogs>;
export type NewDocumentDownloadLog = InferInsertModel<typeof documentDownloadLogs>;
export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;
export type DeletionRequest = InferSelectModel<typeof deletionRequests>;
export type NewDeletionRequest = InferInsertModel<typeof deletionRequests>;
export type PortalAnalyticsEvent = InferSelectModel<typeof portalAnalyticsEvents>;
export type NewPortalAnalyticsEvent = InferInsertModel<typeof portalAnalyticsEvents>;
export type NotificationDispatchLog = InferSelectModel<typeof notificationDispatchLog>;
export type NewNotificationDispatchLog = InferInsertModel<typeof notificationDispatchLog>;
export type ElectionCycle = InferSelectModel<typeof electionCycles>;
export type NewElectionCycle = InferInsertModel<typeof electionCycles>;
export type ElectionPosition = InferSelectModel<typeof electionPositions>;
export type NewElectionPosition = InferInsertModel<typeof electionPositions>;
export type Nomination = InferSelectModel<typeof nominations>;
export type NewNomination = InferInsertModel<typeof nominations>;
export type ElectionVote = InferSelectModel<typeof electionVotes>;
export type NewElectionVote = InferInsertModel<typeof electionVotes>;
export type GeneralPoll = InferSelectModel<typeof generalPolls>;
export type NewGeneralPoll = InferInsertModel<typeof generalPolls>;
export type PollVote = InferSelectModel<typeof pollVotes>;
export type NewPollVote = InferInsertModel<typeof pollVotes>;
export type GovernanceAppointment = InferSelectModel<typeof governanceAppointments>;
export type NewGovernanceAppointment = InferInsertModel<typeof governanceAppointments>;
