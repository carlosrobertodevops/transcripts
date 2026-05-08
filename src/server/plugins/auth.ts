import { Elysia } from "elysia";
import { getSessionFromCookie, Session } from "@/lib/auth";
import { AuthError } from "./error";

export const authPlugin = new Elysia()
  .derive(async ({ request }) => {
    try {
      const session = await getSessionFromCookie(request);
      return { user: session };
    } catch {
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
