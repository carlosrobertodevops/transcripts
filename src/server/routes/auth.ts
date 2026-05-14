import { Elysia } from "elysia";
import { loginSchema, registerSchema } from "@/lib/zod";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { setSessionCookies, clearSessionCookies } from "@/lib/utils-server";
import { signAccess, signRefresh, verifyToken } from "@/lib/jwt";
import { authPlugin } from "../plugins/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, set }) => {
      const parsed = registerSchema.parse(body);
      const name = parsed.name;
      const email = parsed.email.trim().toLowerCase();
      const password = parsed.password;

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length > 0) {
        set.status = 409;
        return { error: "email_taken" };
      }

      const hashedPassword = await hashPassword(password);
      const newUser = await db
        .insert(users)
        .values({
          name,
          email,
          passwordHash: hashedPassword,
          role: "viewer",
        })
        .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

      const user = newUser[0];
      const accessToken = await signAccess({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      const refreshToken = await signRefresh({
        sub: user.id,
        email: user.email,
      });

      setSessionCookies(set, accessToken, refreshToken);
      set.status = 201;

      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        access: accessToken,
      };
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      const parsed = loginSchema.parse(body);
      const email = parsed.email.trim().toLowerCase();
      const password = parsed.password;

      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (result.length === 0) {
        set.status = 401;
        return { error: "invalid_credentials" };
      }

      const user = result[0];
      const valid = await verifyPassword(password, user.passwordHash || "");

      if (!valid) {
        set.status = 401;
        return { error: "invalid_credentials" };
      }

      const accessToken = await signAccess({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      const refreshToken = await signRefresh({
        sub: user.id,
        email: user.email,
      });

      setSessionCookies(set, accessToken, refreshToken);
      set.status = 200;

      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        access: accessToken,
      };
    }
  )
  .post("/logout", ({ set }) => {
    clearSessionCookies(set);
    set.status = 200;
    return { ok: true };
  })
  .get("/me", async ({ user, set }) => {

    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const result = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (result.length === 0) {
      set.status = 401;
      return { error: "user_not_found" };
    }

    set.status = 200;
    return { user: result[0] };
  })
  .post("/refresh", async ({ request, set }) => {
    const cookieHeader = request.headers.get("cookie") || "";
    const refreshMatch = cookieHeader.match(/transcripts_refresh=([^;]+)/);

    if (!refreshMatch) {
      set.status = 401;
      return { error: "refresh_token_missing" };
    }

    const refreshToken = refreshMatch[1];
    let payload;

    try {
      payload = await verifyToken(refreshToken, "refresh");
    } catch {
      set.status = 401;
      return { error: "invalid_refresh_token" };
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, (payload as { sub: string }).sub))
      .limit(1);

    if (result.length === 0) {
      set.status = 401;
      return { error: "user_not_found" };
    }

    const user = result[0];
    const accessToken = await signAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = await signRefresh({
      sub: user.id,
      email: user.email,
    });

    setSessionCookies(set, accessToken, newRefreshToken);
    set.status = 200;

    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });
