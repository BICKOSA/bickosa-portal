-- Announcements feature: admin-composed messages dispatched across channels
-- (email, sms, in-app). Per-recipient deliveries are tracked for audit and
-- (later) retries.

CREATE TYPE "public"."announcement_audience" AS ENUM (
  'all_members',
  'verified_only',
  'chapter',
  'admins'
);--> statement-breakpoint
CREATE TYPE "public"."announcement_channel" AS ENUM (
  'email',
  'sms',
  'in_app'
);--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM (
  'draft',
  'sending',
  'sent',
  'partial',
  'failed'
);--> statement-breakpoint
CREATE TYPE "public"."announcement_delivery_status" AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "summary" varchar(500),
  "body" text NOT NULL,
  "cta_label" varchar(80),
  "cta_url" text,
  "audience" "announcement_audience" NOT NULL,
  "chapter_id" uuid,
  "channels" text[] DEFAULT ARRAY['email']::text[] NOT NULL,
  "status" "announcement_status" DEFAULT 'draft' NOT NULL,
  "recipient_count" integer DEFAULT 0 NOT NULL,
  "success_count" integer DEFAULT 0 NOT NULL,
  "failure_count" integer DEFAULT 0 NOT NULL,
  "created_by_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_chapter_id_chapters_id_fk"
  FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_created_by_id_users_id_fk"
  FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_status_idx"
  ON "announcements" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_created_at_idx"
  ON "announcements" USING btree ("created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcement_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "announcement_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "channel" "announcement_channel" NOT NULL,
  "status" "announcement_delivery_status" DEFAULT 'pending' NOT NULL,
  "provider_ref" varchar(255),
  "error_message" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "announcement_deliveries"
  ADD CONSTRAINT "announcement_deliveries_announcement_id_announcements_id_fk"
  FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "announcement_deliveries"
  ADD CONSTRAINT "announcement_deliveries_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "announcement_deliveries_announcement_user_channel_unique"
  ON "announcement_deliveries" USING btree ("announcement_id", "user_id", "channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_deliveries_announcement_idx"
  ON "announcement_deliveries" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_deliveries_user_idx"
  ON "announcement_deliveries" USING btree ("user_id");
