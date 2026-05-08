import { Elysia } from "elysia";
import { runPendingJobs } from "@/server/services/jobs";

export const jobsRoutes = new Elysia({ prefix: "/jobs" }).post("/run", async ({ headers, set }) => {
  const internalKey = headers["x-internal-key"];
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!internalKey || internalKey !== expectedKey) {
    set.status = 401;
    return { error: "Unauthorized" };
  }

  const processed = await runPendingJobs(5);

  return { ok: true, processed };
});
