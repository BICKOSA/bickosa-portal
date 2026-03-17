CREATE TYPE "public"."amendment_proposal_status" AS ENUM('draft', 'open_for_comment', 'under_review', 'petition_raised', 'approved', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."agm_petition_outcome" AS ENUM('approved', 'deferred', 'withdrawn');--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "constitution_versions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "version_tag" text NOT NULL,
  "effective_date" date NOT NULL,
  "document_url" text,
  "is_current" boolean DEFAULT false NOT NULL,
  "notes" text,
  "published_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "amendment_proposals" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "constitution_version_id" uuid,
  "proposed_by" uuid,
  "clause_reference" text,
  "current_text" text,
  "proposed_text" text,
  "rationale" text NOT NULL,
  "status" "amendment_proposal_status" DEFAULT 'draft' NOT NULL,
  "comment_closes_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "amendment_comments" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "amendment_proposal_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "comment" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agm_petitions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "agm_event_id" uuid,
  "amendment_proposal_id" uuid,
  "outcome" "agm_petition_outcome",
  "outcome_notes" text,
  "voted_at" timestamp with time zone,
  "recorded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "constitution_versions" ADD CONSTRAINT "constitution_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "amendment_proposals" ADD CONSTRAINT "amendment_proposals_constitution_version_id_constitution_versions_id_fk" FOREIGN KEY ("constitution_version_id") REFERENCES "public"."constitution_versions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "amendment_proposals" ADD CONSTRAINT "amendment_proposals_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "amendment_comments" ADD CONSTRAINT "amendment_comments_amendment_proposal_id_amendment_proposals_id_fk" FOREIGN KEY ("amendment_proposal_id") REFERENCES "public"."amendment_proposals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "amendment_comments" ADD CONSTRAINT "amendment_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agm_petitions" ADD CONSTRAINT "agm_petitions_agm_event_id_events_id_fk" FOREIGN KEY ("agm_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agm_petitions" ADD CONSTRAINT "agm_petitions_amendment_proposal_id_amendment_proposals_id_fk" FOREIGN KEY ("amendment_proposal_id") REFERENCES "public"."amendment_proposals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agm_petitions" ADD CONSTRAINT "agm_petitions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "constitution_versions_effective_date_idx" ON "constitution_versions" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amendment_proposals_status_idx" ON "amendment_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amendment_proposals_version_idx" ON "amendment_proposals" USING btree ("constitution_version_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amendment_comments_proposal_idx" ON "amendment_comments" USING btree ("amendment_proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amendment_comments_author_idx" ON "amendment_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agm_petitions_amendment_idx" ON "agm_petitions" USING btree ("amendment_proposal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agm_petitions_agm_event_idx" ON "agm_petitions" USING btree ("agm_event_id");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "constitution_versions_only_one_current_idx"
  ON "constitution_versions" ("is_current")
  WHERE "is_current" = true;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_amendment_comment_update_or_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'amendment_comments are immutable and cannot be updated or deleted';
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_prevent_amendment_comment_update ON amendment_comments;--> statement-breakpoint
CREATE TRIGGER trg_prevent_amendment_comment_update
BEFORE UPDATE ON amendment_comments
FOR EACH ROW
EXECUTE FUNCTION prevent_amendment_comment_update_or_delete();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_prevent_amendment_comment_delete ON amendment_comments;--> statement-breakpoint
CREATE TRIGGER trg_prevent_amendment_comment_delete
BEFORE DELETE ON amendment_comments
FOR EACH ROW
EXECUTE FUNCTION prevent_amendment_comment_update_or_delete();
