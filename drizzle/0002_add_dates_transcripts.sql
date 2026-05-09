ALTER TABLE "transcripts" ADD COLUMN IF NOT EXISTS "operation_date" timestamp;
ALTER TABLE "transcripts" ADD COLUMN IF NOT EXISTS "transcription_date" timestamp;
