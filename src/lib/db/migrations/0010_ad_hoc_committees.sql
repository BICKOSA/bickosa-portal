CREATE TYPE "public"."committee_status" AS ENUM('draft', 'nominations_open', 'nominations_closed', 'active', 'dissolved');--> statement-breakpoint
CREATE TYPE "public"."committee_nomination_status" AS ENUM('pending', 'confirmed_willing', 'declined', 'appointed');--> statement-breakpoint
ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "metadata" jsonb;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "committees" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "purpose" text NOT NULL,
  "max_members" integer,
  "nomination_opens" timestamp with time zone NOT NULL,
  "nomination_closes" timestamp with time zone NOT NULL,
  "status" "committee_status" DEFAULT 'draft' NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "committee_nominations" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "committee_id" uuid NOT NULL,
  "nominee_id" uuid NOT NULL,
  "nominated_by_id" uuid NOT NULL,
  "reason" text,
  "status" "committee_nomination_status" DEFAULT 'pending' NOT NULL,
  "confirmation_sent_at" timestamp with time zone,
  "responded_at" timestamp with time zone,
  "response_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "committee_nominations_committee_nominee_unique" UNIQUE("committee_id", "nominee_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "committee_members" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "committee_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'Member' NOT NULL,
  "appointed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "appointed_by" uuid,
  CONSTRAINT "committee_members_committee_user_unique" UNIQUE("committee_id", "user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committees" ADD CONSTRAINT "committees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committee_nominations" ADD CONSTRAINT "committee_nominations_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committee_nominations" ADD CONSTRAINT "committee_nominations_nominee_id_users_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committee_nominations" ADD CONSTRAINT "committee_nominations_nominated_by_id_users_id_fk" FOREIGN KEY ("nominated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_appointed_by_users_id_fk" FOREIGN KEY ("appointed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "committees_status_idx" ON "committees" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "committees_nomination_window_idx" ON "committees" USING btree ("nomination_opens", "nomination_closes");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "committee_nominations_committee_status_idx" ON "committee_nominations" USING btree ("committee_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "committee_nominations_nominated_by_idx" ON "committee_nominations" USING btree ("nominated_by_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "committee_nominations_nominee_idx" ON "committee_nominations" USING btree ("nominee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "committee_members_committee_idx" ON "committee_members" USING btree ("committee_id");--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_committee_nomination_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'committee_nominations rows are immutable and cannot be deleted';
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_prevent_committee_nomination_delete ON committee_nominations;--> statement-breakpoint
CREATE TRIGGER trg_prevent_committee_nomination_delete
BEFORE DELETE ON committee_nominations
FOR EACH ROW
EXECUTE FUNCTION prevent_committee_nomination_delete();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_committee_nomination_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id <> OLD.id
    OR NEW.committee_id <> OLD.committee_id
    OR NEW.nominee_id <> OLD.nominee_id
    OR NEW.nominated_by_id <> OLD.nominated_by_id
    OR COALESCE(NEW.reason, '') <> COALESCE(OLD.reason, '')
    OR NEW.created_at <> OLD.created_at
  THEN
    RAISE EXCEPTION 'committee_nominations core fields are immutable';
  END IF;

  IF NEW.status = OLD.status THEN
    IF COALESCE(NEW.response_note, '') <> COALESCE(OLD.response_note, '')
      OR NEW.responded_at IS DISTINCT FROM OLD.responded_at
    THEN
      RAISE EXCEPTION 'response fields can only change during a status transition';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status IN ('confirmed_willing', 'declined', 'appointed') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'confirmed_willing' AND NEW.status = 'appointed' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid committee_nominations status transition from % to %', OLD.status, NEW.status;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_enforce_committee_nomination_immutability ON committee_nominations;--> statement-breakpoint
CREATE TRIGGER trg_enforce_committee_nomination_immutability
BEFORE UPDATE ON committee_nominations
FOR EACH ROW
EXECUTE FUNCTION enforce_committee_nomination_immutability();
