import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth";

export const usersRoutes = new Elysia({ prefix: "/users" })
  .get("/me", async ({ request }) => {
    const user = await requireUser(request);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  })
  .patch(
    "/me",
    async ({ request, body }) => {
      const user = await requireUser(request);
      const { name, avatarUrl } = body;

      await db
        .update(users)
        .set({
          ...(name && { name }),
          ...(avatarUrl && { avatarUrl }),
        })
        .where(eq(users.id, user.id));

      return { success: true };
    },
    {
      body: t.Object(
        {
          name: t.Optional(t.String()),
          avatarUrl: t.Optional(t.String()),
        },
        { default: {} }
      ),
    }
  )
  .post(
    "/me/password",
    async ({ request, body }) => {
      const user = await requireUser(request);
      const { current, next } = body;

      // Verify current password
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!userData) {
        throw new Error("User not found");
      }

      const isValid = await verifyPassword(current, userData.passwordHash ?? "");
      if (!isValid) {
        throw new Error("Invalid current password");
      }

      // Hash and update new password
      const hashedNext = await hashPassword(next);
      await db
        .update(users)
        .set({ passwordHash: hashedNext })
        .where(eq(users.id, user.id));

      return { success: true };
    },
    {
      body: t.Object({
        current: t.String(),
        next: t.String(),
      }),
    }
  )
  .delete("/me", async ({ request }) => {
    const user = await requireUser(request);

    // Cascading delete via database constraints
    await db.delete(users).where(eq(users.id, user.id));

    return { success: true };
  });
