import { Elysia } from "elysia";
import { shareSchema } from "@/lib/zod";
import { db } from "@/db/client";
import { shares, transcripts, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AuthError, NotFoundError } from "../plugins/error";

export const sharesRoutes = new Elysia({ prefix: "/transcripts/:id/shares" })
  .post(
    "/",
    async (ctx: any) => {
      const { params, body, user, set } = ctx;
      const typedUser = user as { id: string } | undefined;
      if (!typedUser) {
        set.status = 401;
        throw new AuthError("Unauthorized");
      }

      const data = shareSchema.parse(body);

      const transcript = await db
        .select()
        .from(transcripts)
        .where(
          and(
            eq(transcripts.id, params.id),
            eq(transcripts.ownerId, typedUser.id)
          )
        )
        .limit(1);

      if (transcript.length === 0) {
        set.status = 404;
        throw new NotFoundError("Transcript not found");
      }

      const sharedUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (sharedUser.length === 0) {
        set.status = 404;
        throw new NotFoundError("User not found");
      }

      if (sharedUser[0].id === user.id) {
        set.status = 400;
        return { error: "Cannot share with yourself" };
      }

      const existing = await db
        .select()
        .from(shares)
        .where(
          and(
            eq(shares.transcriptId, params.id),
            eq(shares.sharedWithUserId, sharedUser[0].id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        set.status = 409;
        return { error: "Already shared with this user" };
      }

      const created = await db
        .insert(shares)
        .values({
          transcriptId: params.id,
          ownerId: user.id,
          sharedWithUserId: sharedUser[0].id,
          canEdit: data.canEdit,
        })
        .returning();

      set.status = 201;
      return { share: created[0] };
    }
  )
  .get("/", async (ctx: any) => {
    const { params, user, set } = ctx;
    if (!user) {
      set.status = 401;
      throw new AuthError("Unauthorized");
    }

    const transcript = await db
      .select()
      .from(transcripts)
      .where(
        and(
          eq(transcripts.id, params.id),
          eq(transcripts.ownerId, user.id)
        )
      )
      .limit(1);

    if (transcript.length === 0) {
      set.status = 404;
      throw new NotFoundError("Transcript not found");
    }

    const result = await db
      .select()
      .from(shares)
      .where(eq(shares.transcriptId, params.id));

    return { shares: result };
  })
  .delete("/:shareId", async (ctx: any) => {
    const { params, user, set } = ctx;
    if (!user) {
      set.status = 401;
      throw new AuthError("Unauthorized");
    }

    const share = await db
      .select()
      .from(shares)
      .where(eq(shares.id, params.shareId))
      .limit(1);

    if (share.length === 0) {
      set.status = 404;
      throw new NotFoundError("Share not found");
    }

    if (share[0].ownerId !== user.id) {
      set.status = 403;
      throw new AuthError("Forbidden");
    }

    await db.delete(shares).where(eq(shares.id, params.shareId));

    set.status = 204;
    return null;
  })
  .patch(
    "/:shareId",
    async (ctx: any) => {
      const { params, body, user, set } = ctx;
      if (!user) {
        set.status = 401;
        throw new AuthError("Unauthorized");
      }

      const data = body as { canEdit?: boolean };

      const share = await db
        .select()
        .from(shares)
        .where(eq(shares.id, params.shareId))
        .limit(1);

      if (share.length === 0) {
        set.status = 404;
        throw new NotFoundError("Share not found");
      }

      if (share[0].ownerId !== user.id) {
        set.status = 403;
        throw new AuthError("Forbidden");
      }

      const updated = await db
        .update(shares)
        .set({
          ...(data.canEdit !== undefined && { canEdit: data.canEdit }),
        })
        .where(eq(shares.id, params.shareId))
        .returning();

      return { share: updated[0] };
    }
  );
