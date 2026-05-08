import { Elysia } from "elysia";
import { db } from "@/db/client";
import { transcripts, media, shares, transcriptSegments } from "@/db/schema";
import { authPlugin } from "../plugins/auth";
import { createNotification } from "@/server/services/notification";
import { eq, and, or, desc, asc, ilike, inArray, sql } from "drizzle-orm";

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

    const whereCondition = or(
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

    const finalWhere = searchCondition ? and(whereCondition, searchCondition) : whereCondition;

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

    const { title } = body as { title: string };

    // position = max(position) + 1
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
        position: nextPosition,
        status: "pending",
      })
      .returning();

    set.status = 201;
    return { transcript: newTranscript[0] };
  })
  .get("/:id", async (ctx: any) => { const { user, params, set } = ctx;
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
      operationName?: string;
      analysis?: string;
    };

    await db
      .update(transcripts)
      .set({ ...updates })
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

    await db.delete(transcripts).where(eq(transcripts.id, params.id));

    set.status = 204;
    return null;
  });
