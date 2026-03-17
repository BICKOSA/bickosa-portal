CREATE TABLE "document_download_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"downloaded_by_user_id" uuid NOT NULL,
	"downloaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text
);
--> statement-breakpoint
ALTER TABLE "document_download_logs" ADD CONSTRAINT "document_download_logs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_download_logs" ADD CONSTRAINT "document_download_logs_downloaded_by_user_id_users_id_fk" FOREIGN KEY ("downloaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
