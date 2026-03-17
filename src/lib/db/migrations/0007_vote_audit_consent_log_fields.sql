ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "action" varchar(64);--> statement-breakpoint
ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "resource_type" varchar(64);--> statement-breakpoint
ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "resource_id" uuid;
