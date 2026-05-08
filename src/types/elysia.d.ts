import "elysia";

declare module "elysia" {
  interface Context {
    user: { id: string; email: string; role: "user" | "admin" } | null;
  }
  interface AnyContext {
    user?: { id: string; email: string; role: "user" | "admin" } | null;
  }
}
