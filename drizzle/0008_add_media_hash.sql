-- T5: Capture SHA-256 hash per uploaded media file.
-- Nullable to allow legacy rows; new uploads always populate.

ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "hash" text;
