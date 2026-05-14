import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { getSessionFromCookie, Session } from "@/lib/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { AuthError } from "./error";

export const authPlugin = new Elysia({ name: "auth-plugin" })
  .derive({ as: "global" }, async ({ request }) => {
    try {
      const session = await getSessionFromCookie(request);
      if (!session) {
        if (process.env.AUTH_DEBUG === "1") {
          console.log("[authPlugin] no session");
        }
        return { user: null };
      }
      const fresh = await db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, session.id))
        .limit(1);
      if (fresh.length === 0) {
        if (process.env.AUTH_DEBUG === "1") {
          console.log("[authPlugin] user not found id=", session.id);
        }
        return { user: null };
      }
      const user: Session = {
        id: fresh[0].id,
        email: fresh[0].email,
        role: fresh[0].role,
      };
      if (process.env.AUTH_DEBUG === "1") {
        console.log("[authPlugin] user=", user.email, "role=", user.role);
      }
      return { user };
    } catch (err) {
      if (process.env.AUTH_DEBUG === "1") console.error("[authPlugin] err", err);
      return { user: null };
    }
  })
  .macro(({ onBeforeHandle }) => ({
    requireAuth(handler: any) {
      return onBeforeHandle(async ({ user, set }: { user: Session | null; set: any }) => {
        if (!user) {
          set.status = 401;
          throw new AuthError("Unauthorized");
        }
      });
    },
    requireAdmin(handler: any) {
      return onBeforeHandle(async ({ user, set }: { user: Session | null; set: any }) => {
        if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
          set.status = 403;
          throw new AuthError("Forbidden");
        }
      });
    },
    requireSuperAdmin(handler: any) {
      return onBeforeHandle(async ({ user, set }: { user: Session | null; set: any }) => {
        if (!user || user.role !== "super_admin") {
          set.status = 403;
          throw new AuthError("Forbidden");
        }
      });
    },
    requireManager(handler: any) {
      return onBeforeHandle(async ({ user, set }: { user: Session | null; set: any }) => {
        const managerRoles = ["super_admin", "admin", "pro"];
        if (!user || !managerRoles.includes(user.role)) {
          set.status = 403;
          throw new AuthError("Forbidden");
        }
      });
    },
  }));
