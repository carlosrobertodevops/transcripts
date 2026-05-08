import { Elysia } from "elysia";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { authPlugin } from "../plugins/auth";
import { AuthError, NotFoundError } from "../plugins/error";

export const notificationsRoutes = new Elysia({ prefix: "/notifications" })
  .use(authPlugin)
  .get("/", async ({ store, query, set }: any) => {
    const user = store.user;
    if (!user) {
      set.status = 401;
      throw new AuthError("Unauthorized");
    }

    const page = Math.max(1, parseInt((query.page as string) || "1"));
    const limit = 30;
    const offset = (page - 1) * limit;

    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = items.length > limit;
    const result = items.slice(0, limit);

    set.status = 200;
    return {
      notifications: result,
      page,
      hasMore,
    };
  })
  .patch(
    "/:id/read",
    async ({ params, store, set }: any) => {
      const user = store.user;
      if (!user) {
        set.status = 401;
        throw new AuthError("Unauthorized");
      }

      const notification = await db
        .select()
        .from(notifications)
        .where(
          and(eq(notifications.id, params.id), eq(notifications.userId, user.id))
        )
        .limit(1);

      if (notification.length === 0) {
        set.status = 404;
        throw new NotFoundError("Notification not found");
      }

      const updated = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.id, params.id))
        .returning();

      set.status = 200;
      return { notification: updated[0] };
    }
  )
  .post("/read-all", async ({ store, set }: any) => {
    const user = store.user;
    if (!user) {
      set.status = 401;
      throw new AuthError("Unauthorized");
    }

    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))
      .returning();

    set.status = 200;
    return { updated: result.length };
  });
