-- Off-platform nominations: allow nominee_id to be null and capture invite contact details.
DROP INDEX IF EXISTS "nominations_position_nominee_unique";--> statement-breakpoint
ALTER TABLE "nominations" ALTER COLUMN "nominee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "nominations" ADD COLUMN IF NOT EXISTS "nominee_name" varchar(255);--> statement-breakpoint
ALTER TABLE "nominations" ADD COLUMN IF NOT EXISTS "nominee_email" varchar(255);--> statement-breakpoint
ALTER TABLE "nominations" ADD COLUMN IF NOT EXISTS "nominee_phone" varchar(32);--> statement-breakpoint
ALTER TABLE "nominations" ADD COLUMN IF NOT EXISTS "nominee_graduation_year" integer;--> statement-breakpoint
ALTER TABLE "nominations" ADD COLUMN IF NOT EXISTS "invite_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nominations_position_nominee_user_unique"
  ON "nominations" USING btree ("position_id","nominee_id")
  WHERE "nominations"."nominee_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nominations_position_nominee_email_unique"
  ON "nominations" USING btree ("position_id", lower("nominee_email"))
  WHERE "nominations"."nominee_id" IS NULL AND "nominations"."nominee_email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nominations_nominee_email_idx"
  ON "nominations" USING btree ("nominee_email");--> statement-breakpoint
ALTER TABLE "nominations" ADD CONSTRAINT "nominations_nominee_identity_check"
  CHECK (
    "nominations"."nominee_id" IS NOT NULL
    OR (
      "nominations"."nominee_name" IS NOT NULL
      AND (
        "nominations"."nominee_email" IS NOT NULL
        OR "nominations"."nominee_phone" IS NOT NULL
      )
    )
  );
