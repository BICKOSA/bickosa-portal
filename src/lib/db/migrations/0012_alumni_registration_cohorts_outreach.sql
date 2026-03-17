CREATE TYPE "public"."registration_verification_status" AS ENUM('pending', 'verified', 'rejected', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_group_type" AS ENUM('cohort', 'regional', 'sports', 'leadership', 'general');--> statement-breakpoint

ALTER TABLE "alumni_profiles" ADD COLUMN IF NOT EXISTS "graduation_year" integer;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "alumni_registrations" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "full_name" text NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(32),
  "graduation_year" integer NOT NULL,
  "stream" varchar(120),
  "house" varchar(120),
  "notable_teachers" text,
  "current_location" varchar(255),
  "occupation" varchar(255),
  "linkedin_url" text,
  "how_they_heard" varchar(255),
  "verification_status" "registration_verification_status" DEFAULT 'pending' NOT NULL,
  "verification_notes" text,
  "school_record_match" boolean,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "converted_to_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submission_ip" varchar(64)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "school_enrollment_records" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "full_name" text NOT NULL,
  "graduation_year" integer NOT NULL,
  "stream" varchar(120),
  "house" varchar(120),
  "admission_number" varchar(120),
  "source_file" text NOT NULL,
  "uploaded_by" uuid,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cohorts" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "graduation_year" integer NOT NULL,
  "name" varchar(255),
  "description" text,
  "banner_image_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cohort_representatives" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "cohort_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(100) DEFAULT 'Representative' NOT NULL,
  "appointed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "appointed_by" uuid,
  "is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "whatsapp_groups" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "group_type" "whatsapp_group_type" DEFAULT 'general' NOT NULL,
  "cohort_id" uuid,
  "admin_user_id" uuid,
  "admin_name" varchar(255),
  "admin_phone" varchar(32),
  "member_count" integer,
  "invite_link" text,
  "notes" text,
  "last_outreach_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "alumni_registrations" ADD CONSTRAINT "alumni_registrations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alumni_registrations" ADD CONSTRAINT "alumni_registrations_converted_to_user_id_users_id_fk" FOREIGN KEY ("converted_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "school_enrollment_records" ADD CONSTRAINT "school_enrollment_records_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cohort_representatives" ADD CONSTRAINT "cohort_representatives_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cohort_representatives" ADD CONSTRAINT "cohort_representatives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cohort_representatives" ADD CONSTRAINT "cohort_representatives_appointed_by_users_id_fk" FOREIGN KEY ("appointed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "cohorts_graduation_year_unique" ON "cohorts" USING btree ("graduation_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alumni_registrations_email_idx" ON "alumni_registrations" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alumni_registrations_graduation_year_idx" ON "alumni_registrations" USING btree ("graduation_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alumni_registrations_status_idx" ON "alumni_registrations" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alumni_registrations_created_at_idx" ON "alumni_registrations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_enrollment_records_graduation_year_idx" ON "school_enrollment_records" USING btree ("graduation_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_enrollment_records_full_name_idx" ON "school_enrollment_records" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_enrollment_records_source_file_idx" ON "school_enrollment_records" USING btree ("source_file");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohort_representatives_cohort_idx" ON "cohort_representatives" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohort_representatives_user_idx" ON "cohort_representatives" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_groups_type_idx" ON "whatsapp_groups" USING btree ("group_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_groups_cohort_idx" ON "whatsapp_groups" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_groups_updated_at_idx" ON "whatsapp_groups" USING btree ("updated_at");--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_school_records_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'school_enrollment_records are import-only and cannot be updated or deleted';
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_prevent_school_records_update ON school_enrollment_records;--> statement-breakpoint
CREATE TRIGGER trg_prevent_school_records_update
BEFORE UPDATE ON school_enrollment_records
FOR EACH ROW
EXECUTE FUNCTION prevent_school_records_mutation();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_prevent_school_records_delete ON school_enrollment_records;--> statement-breakpoint
CREATE TRIGGER trg_prevent_school_records_delete
BEFORE DELETE ON school_enrollment_records
FOR EACH ROW
EXECUTE FUNCTION prevent_school_records_mutation();
