import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-prod";

const secret = new TextEncoder().encode(JWT_SECRET);
const refreshSecret = new TextEncoder().encode(JWT_REFRESH_SECRET);

export async function signAccess(
  payload: Record<string, unknown>,
  ttl: string = "7d"
) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ttl)
    .sign(secret);
}

export async function signRefresh(
  payload: Record<string, unknown>,
  ttl: string = "30d"
) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ttl)
    .sign(refreshSecret);
}

export async function verifyToken(
  token: string,
  secretKey: "access" | "refresh" = "access"
) {
  try {
    const key = secretKey === "access" ? secret : refreshSecret;
    const verified = await jose.jwtVerify(token, key);
    return verified.payload;
  } catch {
    return null;
  }
}
