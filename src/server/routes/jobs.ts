import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  transcriptionJobs,
  media,
  transcriptSegments,
  transcripts,
} from "@/db/schema";
import { Elysia } from "elysia";
import { runPendingJobs } from "@/server/services/jobs";

interface AuthedUser {
  id: string;
}

export const jobsRoutes = new Elysia()
  // POST /api/jobs/run — internal worker tick
  .post("/jobs/run", async ({ headers, set }) => {
    const internalKey = headers["x-internal-key"];
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!internalKey || internalKey !== expectedKey) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await runPendingJobs(5);
    return { ok: true };
  })
  // GET /api/transcripts/:id/jobs — fetch job status + accumulated segments (live)
  .get("/transcripts/:id/jobs", async (ctx) => {
    const { params, set } = ctx;
    const user = (ctx as unknown as { user?: AuthedUser | null }).user;

    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const transcript = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.id, params.id))
      .limit(1);

    if (transcript.length === 0 || transcript[0].ownerId !== user.id) {
      set.status = 403;
      return { error: "forbidden" };
    }

    const mediaList = await db
      .select()
      .from(media)
      .where(eq(media.transcriptId, params.id));

    const jobs = await Promise.all(
      mediaList.map(async (m) => {
        const job = await db
          .select()
          .from(transcriptionJobs)
          .where(eq(transcriptionJobs.mediaId, m.id))
          .limit(1);

        const segments = await db
          .select({
            id: transcriptSegments.id,
            startMs: transcriptSegments.startMs,
            endMs: transcriptSegments.endMs,
            text: transcriptSegments.text,
          })
          .from(transcriptSegments)
          .where(eq(transcriptSegments.mediaId, m.id))
          .orderBy(asc(transcriptSegments.startMs));

        const transcriptText = segments.map((s) => s.text).join(" ");

        if (job.length === 0) {
          return {
            id: "no-job",
            mediaId: m.id,
            filename: m.filename,
            status: segments.length > 0 ? ("done" as const) : ("pending" as const),
            transcriptText,
            segmentCount: segments.length,
          };
        }

        const j = job[0];
        return {
          id: j.id,
          mediaId: m.id,
          filename: m.filename,
          status: j.status,
          error: j.error || undefined,
          transcriptText,
          segmentCount: segments.length,
        };
      })
    );

    set.status = 200;
    return { jobs };
  });
