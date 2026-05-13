import { Elysia } from "elysia";
import { db } from "@/db/client";
import { transcripts, media, shares, transcriptSegments } from "@/db/schema";
import { authPlugin } from "../plugins/auth";
import { createNotification } from "@/server/services/notification";
import { storage } from "@/server/services/storage";
import { eq, and, or, desc, asc, ilike, inArray, sql, isNull } from "drizzle-orm";

export const transcriptsRoutes = new Elysia({ prefix: "/transcripts" })
  .use(authPlugin)
  .get("/", async (ctx: any) => {
    const { user, query, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const searchQuery = (query.q as string) || "";
    const page = Math.max(1, parseInt((query.page as string) || "1"));
    const limit = 30;
    const offset = (page - 1) * limit;

    // Acessíveis = ownerId=user.id OR id IN (shares where sharedWithUserId=user.id)
    const sharedIds = await db
      .select({ transcriptId: shares.transcriptId })
      .from(shares)
      .where(eq(shares.sharedWithUserId, user.id));

    const sharedTranscriptIds = sharedIds.map((s) => s.transcriptId);

    const ownershipCondition = or(
      eq(transcripts.ownerId, user.id),
      sharedTranscriptIds.length > 0 ? inArray(transcripts.id, sharedTranscriptIds) : undefined
    );

    const searchCondition =
      searchQuery.length > 0
        ? or(
            ilike(transcripts.title, `%${searchQuery}%`),
            ilike(transcripts.operationName, `%${searchQuery}%`),
            ilike(transcripts.analysis, `%${searchQuery}%`)
          )
        : undefined;

    const finalWhere = and(
      ownershipCondition,
      isNull(transcripts.deletedAt),
      searchCondition,
    );

    const items = await db
      .select()
      .from(transcripts)
      .where(finalWhere)
      .orderBy(asc(transcripts.position), desc(transcripts.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = items.length > limit;
    const result = items.slice(0, limit);

    // Fetch media para cada transcript
    if (result.length > 0) {
      const transcriptIds = result.map((t) => t.id);
      const mediaList = await db
        .select()
        .from(media)
        .where(inArray(media.transcriptId, transcriptIds));

      const mediaByTranscript: Record<string, typeof mediaList> = {};
      mediaList.forEach((m) => {
        if (!mediaByTranscript[m.transcriptId]) {
          mediaByTranscript[m.transcriptId] = [];
        }
        mediaByTranscript[m.transcriptId].push(m);
      });

      return {
        items: result.map((t) => ({
          ...t,
          media: mediaByTranscript[t.id] || [],
        })),
        page,
        hasMore,
      };
    }

    return { items: [], page, hasMore };
  })
  .post("/", async (ctx: any) => { const { user, body, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const {
      title,
      operationName,
      operationDate,
      transcriptionDate,
      analysis,
    } = body as {
      title: string;
      operationName?: string | null;
      operationDate?: string | null;
      transcriptionDate?: string | null;
      analysis?: string | null;
    };

    if (!title || typeof title !== "string" || title.length === 0) {
      set.status = 422;
      return { error: "title_required" };
    }

    const maxPos = await db
      .select({ maxPos: sql<number>`COALESCE(MAX(position), 0)` })
      .from(transcripts)
      .where(eq(transcripts.ownerId, user.id));

    const nextPosition = (maxPos[0]?.maxPos || 0) + 1;

    const newTranscript = await db
      .insert(transcripts)
      .values({
        ownerId: user.id,
        title,
        operationName: operationName || null,
        operationDate: operationDate ? new Date(operationDate) : null,
        transcriptionDate: transcriptionDate ? new Date(transcriptionDate) : null,
        analysis: analysis || null,
        position: nextPosition,
        status: "pending",
      })
      .returning();

    set.status = 201;
    return { ...newTranscript[0], media: [] };
  })
  .get("/:id", async (ctx: any) => { const { user, params, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const transcript = await db
      .select()
      .from(transcripts)
      .where(and(eq(transcripts.id, params.id), isNull(transcripts.deletedAt)))
      .limit(1);

    if (transcript.length === 0) {
      set.status = 404;
      return { error: "not_found" };
    }

    const t = transcript[0];

    // Check acesso (owner ou share)
    const isOwner = t.ownerId === user.id;
    if (!isOwner) {
      const share = await db
        .select()
        .from(shares)
        .where(
          and(eq(shares.transcriptId, params.id), eq(shares.sharedWithUserId, user.id))
        )
        .limit(1);

      if (share.length === 0) {
        set.status = 403;
        return { error: "forbidden" };
      }
    }

    const mediaList = await db
      .select()
      .from(media)
      .where(eq(media.transcriptId, params.id));

    const mediaIds = mediaList.map((m) => m.id);
    const segments =
      mediaIds.length > 0
        ? await db
            .select()
            .from(transcriptSegments)
            .where(inArray(transcriptSegments.mediaId, mediaIds))
        : [];

    set.status = 200;
    return {
      transcript: t,
      media: mediaList,
      segments,
    };
  })
  .patch("/reorder", async (ctx: any) => { const { user, body, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const reorders = body as { id: string; position: number }[];

    // Valida que cada id pertence ao user
    for (const { id } of reorders) {
      const t = await db
        .select()
        .from(transcripts)
        .where(eq(transcripts.id, id))
        .limit(1);

      if (t.length === 0 || t[0].ownerId !== user.id) {
        set.status = 403;
        return { error: "forbidden" };
      }
    }

    // Transação Drizzle
    await db.transaction(async (tx) => {
      for (const { id, position } of reorders) {
        await tx.update(transcripts).set({ position }).where(eq(transcripts.id, id));
      }
    });

    set.status = 200;
    return { ok: true };
  })
  .patch("/:id", async (ctx: any) => { const { user, params, body, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const transcript = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.id, params.id))
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
            eq(shares.transcriptId, params.id),
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

    const updates = body as {
      title?: string;
      operationName?: string | null;
      operationDate?: string | null;
      transcriptionDate?: string | null;
      analysis?: string | null;
      transcriptHtml?: string | null;
    };

    const updateSet: Record<string, unknown> = {};
    if (updates.title !== undefined) updateSet.title = updates.title;
    if (updates.operationName !== undefined) updateSet.operationName = updates.operationName;
    if (updates.analysis !== undefined) updateSet.analysis = updates.analysis;
    if (updates.transcriptHtml !== undefined) updateSet.transcriptHtml = updates.transcriptHtml;
    if (updates.operationDate !== undefined) {
      updateSet.operationDate = updates.operationDate ? new Date(updates.operationDate) : null;
    }
    if (updates.transcriptionDate !== undefined) {
      updateSet.transcriptionDate = updates.transcriptionDate ? new Date(updates.transcriptionDate) : null;
    }
    updateSet.updatedAt = new Date();

    await db
      .update(transcripts)
      .set(updateSet)
      .where(eq(transcripts.id, params.id));

    // Notifica shared users
    const shareList = await db
      .select({ sharedWithUserId: shares.sharedWithUserId })
      .from(shares)
      .where(eq(shares.transcriptId, params.id));

    for (const s of shareList) {
      await createNotification(
        s.sharedWithUserId,
        "transcript_updated",
        { transcriptId: params.id, title: updates.title || t.title }
      );
    }

    set.status = 200;
    return { ok: true };
  })
  .delete("/:id", async (ctx: any) => { const { user, params, set } = ctx;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const transcript = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.id, params.id))
      .limit(1);

    if (transcript.length === 0) {
      set.status = 404;
      return { error: "not_found" };
    }

    const t = transcript[0];

    // Only owner ou admin
    if (t.ownerId !== user.id && user.role !== "admin") {
      set.status = 403;
      return { error: "forbidden" };
    }

    const mediaRows = await db
      .select({ storagePath: media.storagePath })
      .from(media)
      .where(eq(media.transcriptId, params.id));

    for (const m of mediaRows) {
      if (m.storagePath) {
        try {
          await storage.delete(m.storagePath);
        } catch (err) {
          console.error("[transcripts] storage delete failed", m.storagePath, err);
        }
      }
    }

    await db.delete(transcripts).where(eq(transcripts.id, params.id));

    set.status = 204;
    return null;
  });
