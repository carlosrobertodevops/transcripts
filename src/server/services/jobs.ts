import { and, eq, ne, inArray } from "drizzle-orm";
import * as fs from "fs/promises";
import * as path from "path";
import { db } from "@/db/client";
import {
  media as mediaTable,
  transcriptionJobs,
  transcriptSegments,
  transcripts as transcriptsTable,
  notifications,
} from "@/db/schema";
import { getProvider } from "./transcription";
import { storage } from "./storage";

export async function runPendingJobs(limit: number = 3): Promise<void> {
  const pendingJobs = await db
    .select()
    .from(transcriptionJobs)
    .where(eq(transcriptionJobs.status, "pending"))
    .limit(limit);

  for (const job of pendingJobs) {
    try {
      // Mark as processing
      await db
        .update(transcriptionJobs)
        .set({ status: "processing", attempts: (job.attempts ?? 0) + 1 })
        .where(eq(transcriptionJobs.id, job.id));

      // Get media
      const med = await db
        .select()
        .from(mediaTable)
        .where(eq(mediaTable.id, job.mediaId ?? ""))
        .limit(1)
        .then((rows) => rows[0]);

      if (!med) {
        throw new Error(`Media not found: ${job.mediaId ?? "(null)"}`);
      }

      // Read file
      let audioPath = storage.resolve(med.storagePath ?? "");

      // If video, pre-process to audio
      if (med.mime?.startsWith("video/")) {
        const tmpAudio = path.join(
          process.env.STORAGE_DIR || "./uploads",
          `tmp_${Date.now()}.mp3`
        );

        const proc = Bun.spawn(["ffmpeg", "-y", "-i", audioPath, "-vn", "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", tmpAudio]);
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
          throw new Error(`FFmpeg failed with code ${exitCode}`);
        }

        audioPath = tmpAudio;
      }

      // Transcribe
      const provider = getProvider();
      const result = await provider.transcribe(audioPath, "pt");

      const mediaId = med.id;
      // Insert segments
      for (const segment of result.segments) {
        await db.insert(transcriptSegments).values({
          mediaId,
          startMs: segment.startMs,
          endMs: segment.endMs,
          text: segment.text,
        });
      }

      // Update media duration
      await db
        .update(mediaTable)
        .set({ durationSeconds: result.durationSeconds })
        .where(eq(mediaTable.id, mediaId));

      // Mark job done
      await db
        .update(transcriptionJobs)
        .set({ status: "done", finishedAt: new Date() })
        .where(eq(transcriptionJobs.id, job.id));

      // Get transcript ID from media (transcriptionJobs has no transcriptId directly)
      const transcriptId = med.transcriptId ?? "";
      if (!transcriptId) continue;

      // Get all media IDs for this transcript
      const mediaForTranscript = await db
        .select({ id: mediaTable.id })
        .from(mediaTable)
        .where(eq(mediaTable.transcriptId, transcriptId));

      const mediaIds = mediaForTranscript.map((m) => m.id);

      // Check if all jobs for all media in this transcript are done
      let remainingJobs: typeof transcriptionJobs.$inferSelect[] = [];

      if (mediaIds.length > 0) {
        remainingJobs = await db
          .select()
          .from(transcriptionJobs)
          .where(
            and(
              inArray(transcriptionJobs.mediaId, mediaIds),
              ne(transcriptionJobs.status, "done")
            )
          );
      }

      if (remainingJobs.length === 0) {
        // All jobs done, update transcript
        await db
          .update(transcriptsTable)
          .set({ status: "done" })
          .where(eq(transcriptsTable.id, transcriptId));

        // Get transcript owner
        const transcript = await db
          .select()
          .from(transcriptsTable)
          .where(eq(transcriptsTable.id, transcriptId))
          .limit(1)
          .then((rows) => rows[0]);

        if (transcript) {
          // Create notification
          await db.insert(notifications).values({
            userId: transcript.ownerId,
            type: "transcription_done",
            payload: JSON.stringify({ transcriptId }),
          });
        }
      }

      // Clean up temp audio if created
      if (audioPath !== storage.resolve(med.storagePath ?? "")) {
        try {
          await fs.unlink(audioPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      // Error handling
      const errorMsg = error instanceof Error ? error.message : String(error);

      await db
        .update(transcriptionJobs)
        .set({
          status: (job.attempts ?? 0) >= 3 ? "failed" : "pending",
          error: errorMsg,
        })
        .where(eq(transcriptionJobs.id, job.id));
    }
  }
}
