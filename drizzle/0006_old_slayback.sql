CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "transcript_html" text;--> statement-breakpoint
ALTER TABLE "transcription_jobs" ADD COLUMN IF NOT EXISTS "segment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transcription_jobs" ADD COLUMN IF NOT EXISTS "processing_ms" integer;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN IF NOT EXISTS "operation_date" timestamp;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN IF NOT EXISTS "transcription_date" timestamp;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN IF NOT EXISTS "transcript_html" text;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tags" ADD CONSTRAINT "tags_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tags_owner_name_idx" ON "tags" USING btree ("owner_id","name");