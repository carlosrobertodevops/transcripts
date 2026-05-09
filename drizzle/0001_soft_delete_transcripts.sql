ALTER TABLE "transcripts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
CREATE INDEX IF NOT EXISTS "transcripts_deleted_at_idx" ON "transcripts" ("deleted_at");
