import { Elysia } from "elysia";
import { db } from "@/db/client";
import { media, transcripts, transcriptionJobs, shares } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authPlugin } from "../plugins/auth";
import { storage } from "@/server/services/storage";
import crypto from "crypto";

const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-z0-9._-]/gi, "_").slice(0, 255);
};

const isValidMediaMime = (mime: string): boolean => {
  return mime.startsWith("audio/") || mime.startsWith("video/");
};

export const mediaRoutes = new Elysia({ prefix: "/transcripts/:transcriptId/media" })
  .use(authPlugin)
  .post("/upload", async (ctx: any) => {
    const { user, params, request, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    // Check access: owner OR share with canEdit
    const transcript = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.id, params.transcriptId))
      .limit(1);

    if (transcript.length === 0) {
      set.status = 404;
      return { error: "not_found" };
    }

    const t = transcript[0];
    const isOwner = t.ownerId === user.id;

    if (!isOwner) {
      const share = await db
        .select()
        .from(shares)
        .where(
          and(
            eq(shares.transcriptId, params.transcriptId),
            eq(shares.sharedWithUserId, user.id),
            eq(shares.canEdit, true)
          )
        )
        .limit(1);

      if (share.length === 0) {
        set.status = 403;
        return { error: "forbidden" };
      }
    }

    const formData = await request.formData();
    let files = formData.getAll("files") as File[];

    // Fallback: accept single 'file' field if 'files' not provided
    if (!files || files.length === 0) {
      const singleFile = formData.get("file") as File | null;
      if (singleFile) {
        files = [singleFile];
      }
    }

    if (!files || files.length === 0) {
      set.status = 400;
      return { error: "no_files" };
    }

    const mediaList = [];
    const jobsQueued = [];
    let isFirstUpload = true;

    for (const file of files) {
      // Validate MIME type
      if (!isValidMediaMime(file.type)) {
        set.status = 400;
        return { error: "invalid_mime_type" };
      }

      // Validate size (< 500MB)
      if (file.size > 500 * 1024 * 1024) {
        set.status = 413;
        return { error: "file_too_large" };
      }

      // Read file buffer
      const buffer = await file.arrayBuffer();
      const buf = Buffer.from(buffer);

      // Generate storage path
      const dest = `${params.transcriptId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

      // Save to storage
      await storage.save(buf, dest);

      // Insert media record
      const mediaRecord = await db
        .insert(media)
        .values({
          transcriptId: params.transcriptId,
          filename: file.name,
          mime: file.type,
          sizeBytes: file.size,
          storagePath: dest,
          durationSeconds: null, // Will be set by transcription job
        })
        .returning();

      mediaList.push(mediaRecord[0]);

      // Create transcription job
      const job = await db
        .insert(transcriptionJobs)
        .values({
          mediaId: mediaRecord[0].id,
          provider: "openai", // Default provider
          status: "pending",
          attempts: 0,
        })
        .returning();

      jobsQueued.push(job[0]);

      // Update transcript status to 'processing' on first upload
      if (isFirstUpload && mediaList.length === 1) {
        await db
          .update(transcripts)
          .set({ status: "processing" })
          .where(eq(transcripts.id, params.transcriptId));
        isFirstUpload = false;
      }
    }

    set.status = 201;
    return {
      media: mediaList,
      jobsQueued: jobsQueued.length,
    };
  })
  .delete("/:mediaId", async (ctx: any) => {
    const { user, params, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    // Fetch media
    const mediaRecord = await db
      .select()
      .from(media)
      .where(eq(media.id, params.id))
      .limit(1);

    if (mediaRecord.length === 0) {
      set.status = 404;
      return { error: "not_found" };
    }

    const m = mediaRecord[0];

    // Check ownership (only owner can delete)
    const transcript = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.id, m.transcriptId))
      .limit(1);

    if (transcript.length === 0 || transcript[0].ownerId !== user.id) {
      set.status = 403;
      return { error: "forbidden" };
    }

    // Delete from storage
    if (m.storagePath) {
      await storage.delete(m.storagePath);
    }

    // Delete media record (cascades to segments and jobs via FK)
    await db.delete(media).where(eq(media.id, params.id));

    set.status = 204;
    return null;
  });
