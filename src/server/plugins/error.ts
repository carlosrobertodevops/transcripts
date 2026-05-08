import { Elysia } from "elysia";
import { ZodError } from "zod";

class AuthError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

class NotFoundError extends Error {
  constructor(message: string = "Not Found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export const errorPlugin = new Elysia().onError(({ code, error, set }) => {
  if (error instanceof ZodError) {
    set.status = 422;
    return {
      error: "validation",
      details: error.issues.map((e: any) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    };
  }

  if (error instanceof AuthError) {
    set.status = 401;
    return { error: "unauthorized", message: error.message };
  }

  if (error instanceof NotFoundError) {
    set.status = 404;
    return { error: "not_found", message: error.message };
  }

  if (error instanceof Error) {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "not_found" };
    }
  }

  set.status = 500;
  return { error: "internal_error" };
});

export { AuthError, NotFoundError };
