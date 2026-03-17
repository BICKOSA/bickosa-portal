CREATE TYPE "public"."mentorship_contact_method" AS ENUM('email', 'scheduling_link');--> statement-breakpoint
CREATE TABLE "mentorship_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"is_available" boolean DEFAULT false NOT NULL,
	"focus_areas" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"max_mentees" integer DEFAULT 1 NOT NULL,
	"contact_method" "mentorship_contact_method" DEFAULT 'email' NOT NULL,
	"scheduling_url" text,
	"mentorship_bio" varchar(280),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mentorship_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "mentorship_preferences" ADD CONSTRAINT "mentorship_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
