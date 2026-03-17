CREATE TYPE "public"."deletion_request_status" AS ENUM('pending', 'processing', 'completed', 'rejected');--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "receive_mentorship_notifications" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "receive_donation_campaign_updates" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "deletion_request_status" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
