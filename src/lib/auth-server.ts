"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, transcripts, shares, media, transcriptSegments, notifications } from "@/db/schema";
import { verifyToken } from "./jwt";
import { eq, or, and, inArray, sql, isNull } from "drizzle-orm";
import type { UserRole } from "./auth";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export const getCurrentUser = async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("transcripts_session")?.value;

  if (!token) return null;

  const payload = await verifyToken(token, "access");
  if (!payload || typeof payload.sub !== "string") return null;

  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (result.length === 0) return null;
  return result[0] as User;
};

export const requireUser = async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
};

export interface TranscriptWithMedia {
  id: string;
  ownerId: string;
  title: string;
  operationName: string | null;
  operationDate: Date | null;
  transcriptionDate: Date | null;
  analysis: string | null;
  status: string;
  position: number | null;
  createdAt: Date;
  updatedAt: Date;
  media: Array<{
    id: string;
    filename: string;
    mime: string;
    sizeBytes: number | null;
    durationSeconds: number | null;
    description: string | null;
    transcriptHtml: string | null;
    createdAt: Date;
  }>;
}

export const getTranscriptsForUser = async (
  userId: string,
  q?: string
): Promise<TranscriptWithMedia[]> => {
  const userTranscripts = await db
    .select({
      id: transcripts.id,
      ownerId: transcripts.ownerId,
      title: transcripts.title,
      operationName: transcripts.operationName,
      operationDate: transcripts.operationDate,
      transcriptionDate: transcripts.transcriptionDate,
      analysis: transcripts.analysis,
      status: transcripts.status,
      position: transcripts.position,
      createdAt: transcripts.createdAt,
      updatedAt: transcripts.updatedAt,
    })
    .from(transcripts)
    .where(
      or(
        eq(transcripts.ownerId, userId),
        inArray(
          transcripts.id,
          db
            .select({ transcriptId: shares.transcriptId })
            .from(shares)
            .where(eq(shares.sharedWithUserId, userId))
        )
      )
    )
    .orderBy(transcripts.position);

  const transcriptIds = userTranscripts.map((t) => t.id);
  if (transcriptIds.length === 0) return [];

  const mediaData = await db
    .select({
      id: media.id,
      transcriptId: media.transcriptId,
      filename: media.filename,
      mime: media.mime,
      sizeBytes: media.sizeBytes,
      durationSeconds: media.durationSeconds,
      description: media.description,
      transcriptHtml: media.transcriptHtml,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(inArray(media.transcriptId, transcriptIds));

  const mediaByTranscript = mediaData.reduce(
    (acc, m) => {
      if (!acc[m.transcriptId]) acc[m.transcriptId] = [];
      acc[m.transcriptId].push({
        id: m.id,
        filename: m.filename,
        mime: m.mime,
        sizeBytes: m.sizeBytes,
        durationSeconds: m.durationSeconds,
        description: m.description,
        transcriptHtml: m.transcriptHtml,
        createdAt: m.createdAt,
      });
      return acc;
    },
    {} as Record<string, TranscriptWithMedia["media"]>
  );

  let results = userTranscripts.map((t) => ({
    ...t,
    media: mediaByTranscript[t.id] || [],
  }));

  if (q) {
    const lowerQ = q.toLowerCase();
    results = results.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQ) ||
        t.operationName?.toLowerCase().includes(lowerQ) ||
        t.media.some((m) => m.filename.toLowerCase().includes(lowerQ))
    );
  }

  return results;
};

export interface TranscriptDetail extends TranscriptWithMedia {
  segments: Array<{
    id: string;
    mediaId: string;
    startMs: number;
    endMs: number;
    text: string;
  }>;
}

export const getTranscriptDetail = async (
  id: string,
  userId: string
): Promise<TranscriptDetail | null> => {
  const result = await db
    .select({
      id: transcripts.id,
      ownerId: transcripts.ownerId,
      title: transcripts.title,
      operationName: transcripts.operationName,
      operationDate: transcripts.operationDate,
      transcriptionDate: transcripts.transcriptionDate,
      analysis: transcripts.analysis,
      status: transcripts.status,
      position: transcripts.position,
      createdAt: transcripts.createdAt,
      updatedAt: transcripts.updatedAt,
    })
    .from(transcripts)
    .where(eq(transcripts.id, id))
    .limit(1);

  if (result.length === 0) return null;

  const transcript = result[0];

  const hasAccess =
    transcript.ownerId === userId ||
    (await db
      .select({ id: shares.id })
      .from(shares)
      .where(
        and(
          eq(shares.transcriptId, id),
          eq(shares.sharedWithUserId, userId)
        )
      )
      .limit(1)
      .then((r) => r.length > 0));

  if (!hasAccess) return null;

  const mediaData = await db
    .select({
      id: media.id,
      filename: media.filename,
      mime: media.mime,
      sizeBytes: media.sizeBytes,
      durationSeconds: media.durationSeconds,
      description: media.description,
      transcriptHtml: media.transcriptHtml,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(eq(media.transcriptId, id));

  const mediaIds = mediaData.map((m) => m.id);

  let segmentsData: typeof transcriptSegments.$inferSelect[] = [];
  if (mediaIds.length > 0) {
    segmentsData = await db
      .select()
      .from(transcriptSegments)
      .where(inArray(transcriptSegments.mediaId, mediaIds));
  }

  return {
    ...transcript,
    media: mediaData,
    segments: segmentsData,
  };
};

export interface Notification {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}

export const getNotifications = async (
  userId: string,
  unreadOnly = false
): Promise<Notification[]> => {
  const whereConditions = unreadOnly
    ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
    : eq(notifications.userId, userId);

  const rows = await db
    .select()
    .from(notifications)
    .where(whereConditions)
    .orderBy(sql`${notifications.createdAt} DESC`)
    .limit(50);

  return rows.map((r) => ({
    ...r,
    payload: (r.payload ?? null) as Record<string, unknown> | null,
  }));
};
