import { Elysia } from "elysia";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

type HealthStatus = "ok" | "fail" | "skip";

interface HealthChecks {
  db: HealthStatus;
  transcriber: HealthStatus;
}

const pingDb = async (): Promise<HealthStatus> => {
  try {
    await db.execute(sql`SELECT 1`);
    return "ok";
  } catch {
    return "fail";
  }
};

const pingTranscriber = async (url: string | undefined): Promise<HealthStatus> => {
  if (!url) return "skip";
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return r.ok ? "ok" : "fail";
  } catch {
    return "fail";
  }
};

export const healthRoutes = new Elysia().get("/health", async () => {
  const [dbStatus, transcriberStatus] = await Promise.all([
    pingDb(),
    pingTranscriber(process.env.TRANSCRIBER_URL),
  ]);

  const checks: HealthChecks = {
    db: dbStatus,
    transcriber: transcriberStatus,
  };

  const ok = Object.values(checks).every((v) => v === "ok" || v === "skip");

  return {
    ok,
    checks,
    timestamp: new Date().toISOString(),
  };
});
