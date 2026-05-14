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
import {
  getProvider,
  transcribeWithFallback,
  type TranscriptionProvider,
  type TranscriptionResult,
  type TranscriptionSegment,
} from "./transcription";
import { storage } from "./storage";

interface StreamCollectResult {
  segments: TranscriptionSegment[];
  insertedCount: number;
}

const STREAM_BATCH_SIZE = 5;

const collectStream = async (
  provider: TranscriptionProvider,
  audioPath: string,
  mediaId: string,
  jobId: string,
): Promise<StreamCollectResult> => {
  if (typeof provider.transcribeStream !== "function") {
    throw new Error("provider does not support streaming");
  }
  const segments: TranscriptionSegment[] = [];
  let batch: TranscriptionSegment[] = [];
  let insertedCount = 0;

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    await db.insert(transcriptSegments).values(
      batch.map((s) => ({
        mediaId,
        startMs: s.startMs,
        endMs: s.endMs,
        text: s.text,
      })),
    );
    insertedCount += batch.length;
    await db
      .update(transcriptionJobs)
      .set({ segmentCount: insertedCount })
      .where(eq(transcriptionJobs.id, jobId));
    batch = [];
  };

  for await (const seg of provider.transcribeStream(audioPath, "pt")) {
    segments.push(seg);
    batch.push(seg);
    if (batch.length >= STREAM_BATCH_SIZE) {
      await flush();
    }
  }
  await flush();

  return { segments, insertedCount };
};

const bulkInsertSegments = async (
  segments: TranscriptionSegment[],
  mediaId: string,
): Promise<void> => {
  if (segments.length === 0) return;
  await db.transaction(async (tx) => {
    await tx.insert(transcriptSegments).values(
      segments.map((s) => ({
        mediaId,
        startMs: s.startMs,
        endMs: s.endMs,
        text: s.text,
      })),
    );
  });
};

export const runPendingJobs = async (limit: number = 3): Promise<void> => {
  const pendingJobs = await db
    .select()
    .from(transcriptionJobs)
    .where(eq(transcriptionJobs.status, "pending"))
    .limit(limit);

  for (const job of pendingJobs) {
    const startedAtMs = Date.now();
    try {
      const claimed = await db
        .update(transcriptionJobs)
        .set({
          status: "processing",
          attempts: (job.attempts ?? 0) + 1,
          startedAt: new Date(),
          segmentCount: 0,
        })
        .where(
          and(
            eq(transcriptionJobs.id, job.id),
            eq(transcriptionJobs.status, "pending"),
          ),
        )
        .returning({ id: transcriptionJobs.id });

      if (claimed.length === 0) {
        continue;
      }

      const med = await db
        .select()
        .from(mediaTable)
        .where(eq(mediaTable.id, job.mediaId ?? ""))
        .limit(1)
        .then((rows) => rows[0]);

      if (!med) {
        throw new Error(`Media not found: ${job.mediaId ?? "(null)"}`);
      }

      await db
        .delete(transcriptSegments)
        .where(eq(transcriptSegments.mediaId, med.id));

      let audioPath = storage.resolve(med.storagePath ?? "");

      if (med.mime?.startsWith("video/")) {
        const tmpAudio = path.join(
          process.env.STORAGE_DIR || "./uploads",
          `tmp_${Date.now()}.mp3`,
        );

        const proc = Bun.spawn([
          "ffmpeg",
          "-y",
          "-i",
          audioPath,
          "-vn",
          "-acodec",
          "libmp3lame",
          "-ar",
          "16000",
          "-ac",
          "1",
          tmpAudio,
        ]);
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
          throw new Error(`FFmpeg failed with code ${exitCode}`);
        }

        audioPath = tmpAudio;
      }

      const provider = getProvider();
      const mediaId = med.id;
      let result: TranscriptionResult;

      if (typeof provider.transcribeStream === "function") {
        const { segments } = await collectStream(provider, audioPath, mediaId, job.id);
        const text = segments.map((s) => s.text).join(" ");
        result = {
          text,
          segments,
          durationSeconds: med.durationSeconds ?? 0,
        };
      } else {
        result = await transcribeWithFallback(audioPath, "pt");
        await bulkInsertSegments(result.segments, mediaId);
      }

      await db
        .update(mediaTable)
        .set({ durationSeconds: result.durationSeconds })
        .where(eq(mediaTable.id, mediaId));

      const processingMs = Date.now() - startedAtMs;
      const rtf =
        result.durationSeconds && result.durationSeconds > 0
          ? processingMs / 1000 / result.durationSeconds
          : null;
      console.log(
        `[jobs] job=${job.id} processingMs=${processingMs} rtf=${rtf?.toFixed(2) ?? "n/a"} segments=${result.segments.length}`,
      );

      await db
        .update(transcriptionJobs)
        .set({
          status: "done",
          finishedAt: new Date(),
          processingMs,
          segmentCount: result.segments.length,
        })
        .where(eq(transcriptionJobs.id, job.id));

      const transcriptId = med.transcriptId ?? "";
      if (!transcriptId) continue;

      const mediaForTranscript = await db
        .select({ id: mediaTable.id })
        .from(mediaTable)
        .where(eq(mediaTable.transcriptId, transcriptId));

      const mediaIds = mediaForTranscript.map((m) => m.id);

      let remainingJobs: (typeof transcriptionJobs.$inferSelect)[] = [];

      if (mediaIds.length > 0) {
        remainingJobs = await db
          .select()
          .from(transcriptionJobs)
          .where(
            and(
              inArray(transcriptionJobs.mediaId, mediaIds),
              ne(transcriptionJobs.status, "done"),
            ),
          );
      }

      if (remainingJobs.length === 0) {
        await db
          .update(transcriptsTable)
          .set({ status: "done" })
          .where(eq(transcriptsTable.id, transcriptId));

        const transcript = await db
          .select()
          .from(transcriptsTable)
          .where(eq(transcriptsTable.id, transcriptId))
          .limit(1)
          .then((rows) => rows[0]);

        if (transcript) {
          await db.insert(notifications).values({
            userId: transcript.ownerId,
            type: "transcription_done",
            payload: { transcriptId },
          });
        }
      }

      if (audioPath !== storage.resolve(med.storagePath ?? "")) {
        try {
          await fs.unlink(audioPath);
        } catch {
          // ignore cleanup errors
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const processingMs = Date.now() - startedAtMs;
      console.error(`[jobs] job=${job.id} failed processingMs=${processingMs} err=${errorMsg}`);

      await db
        .update(transcriptionJobs)
        .set({
          status: (job.attempts ?? 0) >= 3 ? "failed" : "pending",
          error: errorMsg,
          processingMs,
        })
        .where(eq(transcriptionJobs.id, job.id));
    }
  }
};

