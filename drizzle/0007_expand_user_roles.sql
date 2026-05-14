-- Expand user_role enum from ("user","admin") to
-- ("super_admin","admin","pro","viewer"). Legacy mapping:
--   admin -> super_admin
--   user  -> viewer

ALTER TYPE "user_role" RENAME TO "user_role_old";--> statement-breakpoint

CREATE TYPE "user_role" AS ENUM ('super_admin', 'admin', 'pro', 'viewer');--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "user_role"
  USING (
    CASE "role"::text
      WHEN 'admin' THEN 'super_admin'::"user_role"
      WHEN 'user' THEN 'viewer'::"user_role"
      ELSE 'viewer'::"user_role"
    END
  );--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'viewer';--> statement-breakpoint

DROP TYPE "user_role_old";
