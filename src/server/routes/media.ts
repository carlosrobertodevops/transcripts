import { Elysia } from "elysia";
import { db } from "@/db/client";
import { media, transcripts, transcriptionJobs, transcriptSegments, shares, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authPlugin } from "../plugins/auth";
import { storage } from "@/server/services/storage";
import crypto from "crypto";
import {
  canEditTranscript,
  canDeleteTranscript,
} from "@/lib/permissions";
import type { UserRole } from "@/lib/auth";

const loadTranscriptContext = async (
  transcriptId: string,
  userId: string,
): Promise<{
  transcript: typeof transcripts.$inferSelect | null;
  owner: { id: string; role: UserRole } | null;
  share: { canEdit: boolean | null } | null;
}> => {
  const t = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.id, transcriptId))
    .limit(1);
  if (t.length === 0) return { transcript: null, owner: null, share: null };
  const ownerRow = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, t[0].ownerId))
    .limit(1);
  const owner = ownerRow[0]
    ? { id: ownerRow[0].id, role: ownerRow[0].role as UserRole }
    : { id: t[0].ownerId, role: "viewer" as UserRole };
  const share = t[0].ownerId === userId
    ? null
    : (await db
        .select()
        .from(shares)
        .where(
          and(eq(shares.transcriptId, transcriptId), eq(shares.sharedWithUserId, userId)),
        )
        .limit(1))[0] ?? null;
  return { transcript: t[0], owner, share };
};

const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-z0-9._-]/gi, "_").slice(0, 255);
};

const AUDIO_VIDEO_EXTS = new Set([
  "mp3", "wav", "m4a", "aac", "ogg", "oga", "opus", "flac", "wma", "mp4", "mov", "avi", "mkv", "webm", "m4v",
]);

const isValidMediaMime = (mime: string, filename: string): boolean => {
  if (mime?.startsWith("audio/") || mime?.startsWith("video/")) return true;
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return AUDIO_VIDEO_EXTS.has(ext);
};

const inferMime = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac",
    ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", flac: "audio/flac",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    mkv: "video/x-matroska", webm: "video/webm", m4v: "video/mp4",
  };
  return map[ext] ?? "application/octet-stream";
};

export const mediaRoutes = new Elysia()
  .use(authPlugin)
  .post("/transcripts/:id/media", async (ctx: any) => {
    const { user, params, body, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const ctxLoad = await loadTranscriptContext(params.id, user.id);
    if (!ctxLoad.transcript || !ctxLoad.owner) {
      set.status = 404;
      return { error: "not_found" };
    }
    if (!canEditTranscript(
      { id: user.id, role: user.role as UserRole },
      ctxLoad.owner,
      ctxLoad.share ? { canEdit: ctxLoad.share.canEdit } : null,
    )) {
      set.status = 403;
      return { error: "forbidden" };
    }
    const t = ctxLoad.transcript;

    let files: File[] = [];
    if (body && typeof body === "object") {
      const filesField = (body as Record<string, unknown>).files;
      if (Array.isArray(filesField)) {
        files = filesField.filter((f): f is File => f instanceof File);
      } else if (filesField instanceof File) {
        files = [filesField];
      }
      if (files.length === 0) {
        const singleFile = (body as Record<string, unknown>).file;
        if (singleFile instanceof File) files = [singleFile];
        else if (Array.isArray(singleFile)) {
          files = singleFile.filter((f): f is File => f instanceof File);
        }
      }
    }

    if (files.length === 0) {
      set.status = 400;
      return { error: "no_files" };
    }

    const mediaList = [];
    const jobsQueued = [];
    let isFirstUpload = true;

    const provider = process.env.TRANSCRIPTION_PROVIDER ?? "groq";

    const rawDescriptions = (body as Record<string, unknown>).descriptions;
    const descriptionList: string[] = Array.isArray(rawDescriptions)
      ? rawDescriptions.map((d) => (typeof d === "string" ? d : ""))
      : typeof rawDescriptions === "string"
        ? [rawDescriptions]
        : [];
    const singleDescription = (body as Record<string, unknown>).description;
    if (descriptionList.length === 0 && typeof singleDescription === "string") {
      descriptionList.push(singleDescription);
    }

    for (const [idx, file] of files.entries()) {
      const mime = inferMime(file);

      if (!isValidMediaMime(mime, file.name)) {
        set.status = 400;
        return { error: "invalid_mime_type", filename: file.name, mime };
      }

      if (file.size > 500 * 1024 * 1024) {
        set.status = 413;
        return { error: "file_too_large" };
      }

      const buffer = await file.arrayBuffer();
      const buf = Buffer.from(buffer);
      const hash = crypto.createHash("sha256").update(buf).digest("hex");

      const dest = `${params.id}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

      try {
        await storage.save(buf, dest);
      } catch (err) {
        console.error("[media] storage.save failed", err);
        set.status = 500;
        return { error: "storage_failed", message: (err as Error)?.message };
      }

      const desc = descriptionList[idx];
      const mediaRecord = await db
        .insert(media)
        .values({
          transcriptId: params.id,
          filename: file.name,
          mime,
          sizeBytes: file.size,
          storagePath: dest,
          durationSeconds: null,
          description: desc && desc.trim().length > 0 ? desc : null,
          hash,
        })
        .returning();

      mediaList.push(mediaRecord[0]);

      const job = await db
        .insert(transcriptionJobs)
        .values({
          mediaId: mediaRecord[0].id,
          provider,
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
          .where(eq(transcripts.id, params.id));
        isFirstUpload = false;
      }
    }

    set.status = 201;
    return {
      media: mediaList,
      jobsQueued: jobsQueued.length,
    };
  })
  .patch("/media/:id", async (ctx: any) => {
    const { user, params, body, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

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
    const patchCtx = await loadTranscriptContext(m.transcriptId, user.id);
    if (!patchCtx.transcript || !patchCtx.owner) {
      set.status = 404;
      return { error: "not_found" };
    }
    if (!canEditTranscript(
      { id: user.id, role: user.role as UserRole },
      patchCtx.owner,
      patchCtx.share ? { canEdit: patchCtx.share.canEdit } : null,
    )) {
      set.status = 403;
      return { error: "forbidden" };
    }

    const updates = body as {
      description?: string | null;
      filename?: string;
      transcriptHtml?: string | null;
    };
    const updateSet: Record<string, unknown> = {};
    if (updates.description !== undefined) {
      const d = typeof updates.description === "string" ? updates.description.trim() : "";
      updateSet.description = d.length > 0 ? d : null;
    }
    if (typeof updates.filename === "string" && updates.filename.trim().length > 0) {
      updateSet.filename = updates.filename.trim();
    }
    if (updates.transcriptHtml !== undefined) {
      updateSet.transcriptHtml = updates.transcriptHtml || null;
    }

    if (Object.keys(updateSet).length === 0) {
      set.status = 400;
      return { error: "no_updates" };
    }

    const updated = await db
      .update(media)
      .set(updateSet)
      .where(eq(media.id, params.id))
      .returning();

    set.status = 200;
    return updated[0];
  })
  .delete("/media/:id", async (ctx: any) => {
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

    const delCtx = await loadTranscriptContext(m.transcriptId, user.id);
    if (!delCtx.transcript || !delCtx.owner) {
      set.status = 404;
      return { error: "not_found" };
    }
    if (!canDeleteTranscript(
      { id: user.id, role: user.role as UserRole },
      delCtx.owner,
    )) {
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
  })
  .post("/media/:id/retranscribe", async (ctx: any) => {
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

    const retransCtx = await loadTranscriptContext(m.transcriptId, user.id);
    if (!retransCtx.transcript || !retransCtx.owner) {
      set.status = 404;
      return { error: "not_found" };
    }
    if (!canEditTranscript(
      { id: user.id, role: user.role as UserRole },
      retransCtx.owner,
      retransCtx.share ? { canEdit: retransCtx.share.canEdit } : null,
    )) {
      set.status = 403;
      return { error: "forbidden" };
    }

    // Delete existing segments + job for this media
    await db.delete(transcriptSegments).where(eq(transcriptSegments.mediaId, params.id));
    await db.delete(transcriptionJobs).where(eq(transcriptionJobs.mediaId, params.id));

    // Create new pending job
    const provider = process.env.TRANSCRIPTION_PROVIDER ?? "groq";
    const job = await db
      .insert(transcriptionJobs)
      .values({
        mediaId: params.id,
        provider,
        status: "pending",
        attempts: 0,
      })
      .returning();

    set.status = 201;
    return { job: job[0] };
  });
