import { Elysia } from "elysia";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tags, transcriptSegments, media, transcripts } from "@/db/schema";
import { authPlugin } from "../plugins/auth";

interface AuthedUser {
  id: string;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const sanitizeColor = (c: unknown): string => {
  if (typeof c === "string" && HEX_COLOR.test(c)) return c.toLowerCase();
  return "#6366f1";
};

export const tagsRoutes = new Elysia({ prefix: "/tags" })
  .use(authPlugin)
  .get("/", async (ctx) => {
    const { set } = ctx;
    const user = (ctx as unknown as { user?: AuthedUser | null }).user;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const list = await db
      .select()
      .from(tags)
      .where(eq(tags.ownerId, user.id));

    const enriched = await Promise.all(
      list.map(async (t) => {
        const rows = await db
          .select({
            count: sql<number>`COUNT(*)::int`,
          })
          .from(transcriptSegments)
          .innerJoin(media, eq(media.id, transcriptSegments.mediaId))
          .innerJoin(transcripts, eq(transcripts.id, media.transcriptId))
          .where(
            and(
              eq(transcripts.ownerId, user.id),
              sql`${transcriptSegments.text} ~* ${"\\m" + t.name + "\\M"}`
            )
          );
        return { ...t, occurrences: rows[0]?.count ?? 0 };
      })
    );

    return { tags: enriched };
  })
  .post("/", async (ctx) => {
    const { body, set } = ctx;
    const user = (ctx as unknown as { user?: AuthedUser | null }).user;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const { name, color } = body as { name?: string; color?: string };
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (trimmed.length === 0 || trimmed.length > 64) {
      set.status = 422;
      return { error: "invalid_name" };
    }

    try {
      const inserted = await db
        .insert(tags)
        .values({
          ownerId: user.id,
          name: trimmed,
          color: sanitizeColor(color),
        })
        .returning();
      set.status = 201;
      return inserted[0];
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("tags_owner_name_idx") || msg.toLowerCase().includes("unique")) {
        set.status = 409;
        return { error: "duplicate" };
      }
      throw err;
    }
  })
  .patch("/:id", async (ctx) => {
    const { params, body, set } = ctx;
    const user = (ctx as unknown as { user?: AuthedUser | null }).user;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const existing = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, params.id), eq(tags.ownerId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      set.status = 404;
      return { error: "not_found" };
    }

    const { name, color } = body as { name?: string; color?: string };
    const updateSet: Record<string, unknown> = {};
    if (typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed.length === 0 || trimmed.length > 64) {
        set.status = 422;
        return { error: "invalid_name" };
      }
      updateSet.name = trimmed;
    }
    if (color !== undefined) updateSet.color = sanitizeColor(color);

    if (Object.keys(updateSet).length === 0) {
      set.status = 400;
      return { error: "no_updates" };
    }

    const updated = await db
      .update(tags)
      .set(updateSet)
      .where(eq(tags.id, params.id))
      .returning();
    return updated[0];
  })
  .delete("/:id", async (ctx) => {
    const { params, set } = ctx;
    const user = (ctx as unknown as { user?: AuthedUser | null }).user;
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const existing = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, params.id), eq(tags.ownerId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      set.status = 404;
      return { error: "not_found" };
    }

    await db.delete(tags).where(eq(tags.id, params.id));
    set.status = 204;
    return null;
  });
