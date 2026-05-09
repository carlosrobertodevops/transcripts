import { Elysia } from "elysia";
import { getSessionFromCookie, Session } from "@/lib/auth";
import { AuthError } from "./error";

export const authPlugin = new Elysia({ name: "auth-plugin" })
  .derive({ as: "global" }, async ({ request }) => {
    try {
      const session = await getSessionFromCookie(request);
      if (process.env.AUTH_DEBUG === "1") {
        console.log("[authPlugin] cookie=", request.headers.get("cookie")?.slice(0, 60), "session=", session?.email ?? null);
      }
      return { user: session };
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
        if (!user || user.role !== "admin") {
          set.status = 403;
          throw new AuthError("Forbidden");
        }
      });
    },
  }));
