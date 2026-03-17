CREATE EXTENSION IF NOT EXISTS "uuid-ossp";--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."election_cycle_status" AS ENUM(
    'draft',
    'nominations_open',
    'nominations_closed',
    'voting_open',
    'voting_closed',
    'results_published'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."nomination_status" AS ENUM('pending', 'approved', 'rejected', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."poll_status" AS ENUM('draft', 'open', 'closed', 'results_published');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."poll_target_audience" AS ENUM('all_members', 'verified_only', 'chapter');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."poll_type" AS ENUM('yes_no_abstain', 'multiple_choice', 'ranked_choice');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "election_cycles" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "nomination_opens" timestamp with time zone NOT NULL,
  "nomination_closes" timestamp with time zone NOT NULL,
  "voting_opens" timestamp with time zone NOT NULL,
  "voting_closes" timestamp with time zone NOT NULL,
  "results_published" boolean DEFAULT false NOT NULL,
  "status" "election_cycle_status" DEFAULT 'draft' NOT NULL,
  "quorum_percent" integer DEFAULT 25 NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "election_positions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "election_cycle_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "max_winners" integer DEFAULT 1 NOT NULL,
  "max_nominations" integer DEFAULT 10 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nominations" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "election_cycle_id" uuid NOT NULL,
  "position_id" uuid NOT NULL,
  "nominee_id" uuid NOT NULL,
  "nominated_by_id" uuid NOT NULL,
  "manifesto" text,
  "status" "nomination_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "review_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "election_votes" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "election_cycle_id" uuid NOT NULL,
  "position_id" uuid NOT NULL,
  "voter_id" uuid NOT NULL,
  "nominee_id" uuid NOT NULL,
  "cast_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "general_polls" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "poll_type" "poll_type" DEFAULT 'yes_no_abstain' NOT NULL,
  "options" jsonb,
  "is_anonymous" boolean DEFAULT false NOT NULL,
  "voting_opens" timestamp with time zone NOT NULL,
  "voting_closes" timestamp with time zone NOT NULL,
  "quorum_percent" integer DEFAULT 10 NOT NULL,
  "results_published" boolean DEFAULT false NOT NULL,
  "status" "poll_status" DEFAULT 'draft' NOT NULL,
  "created_by" uuid,
  "target_audience" "poll_target_audience" DEFAULT 'verified_only' NOT NULL,
  "chapter_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_votes" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "poll_id" uuid NOT NULL,
  "voter_id" uuid NOT NULL,
  "choice" jsonb NOT NULL,
  "cast_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "governance_appointments" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "position" text NOT NULL,
  "term_start" date NOT NULL,
  "term_end" date,
  "is_current" boolean DEFAULT true NOT NULL,
  "appointed_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "election_cycles"
  ADD CONSTRAINT "election_cycles_created_by_users_id_fk"
  FOREIGN KEY ("created_by")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_positions"
  ADD CONSTRAINT "election_positions_election_cycle_id_election_cycles_id_fk"
  FOREIGN KEY ("election_cycle_id")
  REFERENCES "public"."election_cycles"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominations"
  ADD CONSTRAINT "nominations_election_cycle_id_election_cycles_id_fk"
  FOREIGN KEY ("election_cycle_id")
  REFERENCES "public"."election_cycles"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominations"
  ADD CONSTRAINT "nominations_position_id_election_positions_id_fk"
  FOREIGN KEY ("position_id")
  REFERENCES "public"."election_positions"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominations"
  ADD CONSTRAINT "nominations_nominee_id_users_id_fk"
  FOREIGN KEY ("nominee_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominations"
  ADD CONSTRAINT "nominations_nominated_by_id_users_id_fk"
  FOREIGN KEY ("nominated_by_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominations"
  ADD CONSTRAINT "nominations_reviewed_by_users_id_fk"
  FOREIGN KEY ("reviewed_by")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_votes"
  ADD CONSTRAINT "election_votes_election_cycle_id_election_cycles_id_fk"
  FOREIGN KEY ("election_cycle_id")
  REFERENCES "public"."election_cycles"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_votes"
  ADD CONSTRAINT "election_votes_position_id_election_positions_id_fk"
  FOREIGN KEY ("position_id")
  REFERENCES "public"."election_positions"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_votes"
  ADD CONSTRAINT "election_votes_voter_id_users_id_fk"
  FOREIGN KEY ("voter_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_votes"
  ADD CONSTRAINT "election_votes_nominee_id_nominations_id_fk"
  FOREIGN KEY ("nominee_id")
  REFERENCES "public"."nominations"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_polls"
  ADD CONSTRAINT "general_polls_created_by_users_id_fk"
  FOREIGN KEY ("created_by")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_polls"
  ADD CONSTRAINT "general_polls_chapter_id_chapters_id_fk"
  FOREIGN KEY ("chapter_id")
  REFERENCES "public"."chapters"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes"
  ADD CONSTRAINT "poll_votes_poll_id_general_polls_id_fk"
  FOREIGN KEY ("poll_id")
  REFERENCES "public"."general_polls"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes"
  ADD CONSTRAINT "poll_votes_voter_id_users_id_fk"
  FOREIGN KEY ("voter_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governance_appointments"
  ADD CONSTRAINT "governance_appointments_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governance_appointments"
  ADD CONSTRAINT "governance_appointments_appointed_by_users_id_fk"
  FOREIGN KEY ("appointed_by")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "election_cycles_status_idx" ON "election_cycles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nominations_position_nominee_unique" ON "nominations" USING btree ("position_id", "nominee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nominations_election_cycle_status_idx" ON "nominations" USING btree ("election_cycle_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nominations_nominee_id_idx" ON "nominations" USING btree ("nominee_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "election_votes_position_voter_unique" ON "election_votes" USING btree ("position_id", "voter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "election_votes_election_cycle_voter_idx" ON "election_votes" USING btree ("election_cycle_id", "voter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_polls_status_idx" ON "general_polls" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "general_polls_voting_window_idx" ON "general_polls" USING btree ("voting_opens", "voting_closes");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "poll_votes_poll_voter_unique" ON "poll_votes" USING btree ("poll_id", "voter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poll_votes_poll_id_idx" ON "poll_votes" USING btree ("poll_id");
