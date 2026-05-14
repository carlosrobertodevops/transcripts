import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword, requireUser } from "@/lib/auth";
import type { UserRole, Session } from "@/lib/auth";
import { authPlugin } from "@/server/plugins/auth";
import {
  canViewUser,
  canEditUser,
  canDeleteUser,
  canCreateUser,
  canChangeRole,
} from "@/lib/permissions";
import {
  listVisibleUsers,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  deleteUser,
} from "@/server/services/user";

const roleSchema = t.Union([
  t.Literal("super_admin"),
  t.Literal("admin"),
  t.Literal("pro"),
  t.Literal("viewer"),
]);

export const usersRoutes = new Elysia({ prefix: "/users" })
  .use(authPlugin)
  // ----- self endpoints (existing) -----
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
    await db.delete(users).where(eq(users.id, user.id));
    return { success: true };
  })
  // ----- admin endpoints -----
  .get(
    "/",
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const items = await listVisibleUsers({
        actorId: user.id,
        actorRole: user.role,
        q: query.q,
      });
      return { items };
    },
    {
      query: t.Object({ q: t.Optional(t.String()) }),
    }
  )
  .get(
    "/:id",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const target = await findUserById(params.id);
      if (!target) {
        set.status = 404;
        return { error: "not_found" };
      }
      if (!canViewUser({ id: user.id, role: user.role }, { id: target.id, role: target.role })) {
        set.status = 403;
        return { error: "forbidden" };
      }
      return target;
    }
  )
  .post(
    "/",
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      if (!canCreateUser({ id: user.id, role: user.role }, body.role)) {
        set.status = 403;
        return { error: "forbidden" };
      }
      const existing = await findUserByEmail(body.email);
      if (existing) {
        set.status = 409;
        return { error: "email_in_use" };
      }
      const created = await createUser({
        email: body.email,
        password: body.password,
        name: body.name ?? null,
        role: body.role,
        avatarUrl: body.avatarUrl ?? null,
      });
      set.status = 201;
      return created;
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        name: t.Optional(t.Nullable(t.String())),
        role: roleSchema,
        avatarUrl: t.Optional(t.Nullable(t.String())),
      }),
    }
  )
  .patch(
    "/:id",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const target = await findUserById(params.id);
      if (!target) {
        set.status = 404;
        return { error: "not_found" };
      }
      const actor = { id: user.id, role: user.role };
      const targetRef = { id: target.id, role: target.role };
      if (!canEditUser(actor, targetRef)) {
        set.status = 403;
        return { error: "forbidden" };
      }
      if (body.role && body.role !== target.role) {
        if (!canChangeRole(actor, targetRef, body.role)) {
          set.status = 403;
          return { error: "forbidden_role_change" };
        }
      }
      if (body.email && body.email !== target.email) {
        const dup = await findUserByEmail(body.email);
        if (dup && dup.id !== target.id) {
          set.status = 409;
          return { error: "email_in_use" };
        }
      }
      const updated = await updateUser(target.id, {
        name: body.name,
        avatarUrl: body.avatarUrl,
        email: body.email,
        role: body.role,
        password: body.password,
      });
      return updated;
    },
    {
      body: t.Object({
        name: t.Optional(t.Nullable(t.String())),
        avatarUrl: t.Optional(t.Nullable(t.String())),
        email: t.Optional(t.String({ format: "email" })),
        role: t.Optional(roleSchema),
        password: t.Optional(t.String({ minLength: 6 })),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const target = await findUserById(params.id);
      if (!target) {
        set.status = 404;
        return { error: "not_found" };
      }
      if (!canDeleteUser({ id: user.id, role: user.role }, { id: target.id, role: target.role })) {
        set.status = 403;
        return { error: "forbidden" };
      }
      await deleteUser(target.id);
      set.status = 204;
      return null;
    }
  );
