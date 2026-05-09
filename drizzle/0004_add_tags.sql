CREATE TABLE "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#6366f1',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "tags_owner_name_idx" ON "tags" ("owner_id", "name");
ALTER TABLE "transcripts" ADD COLUMN "transcript_html" text;
