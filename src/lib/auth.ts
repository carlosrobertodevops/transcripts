import bcryptjs from "bcryptjs";
import { verifyToken } from "./jwt";

export const SESSION_COOKIE = "transcripts_session";
export const REFRESH_COOKIE = "transcripts_refresh";

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export interface Session {
  id: string;
  email: string;
  role: string;
}

export async function getSessionFromCookie(req: Request): Promise<Session | null> {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;

  const sessionMatch = cookie.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`)
  );
  if (!sessionMatch) return null;

  const token = sessionMatch[1];
  const payload = await verifyToken(token, "access");

  if (!payload) return null;

  return {
    id: payload.id as string,
    email: payload.email as string,
    role: payload.role as string,
  };
}

export async function requireUser(req: Request): Promise<Session> {
  const session = await getSessionFromCookie(req);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
