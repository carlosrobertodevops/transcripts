import { SESSION_COOKIE, REFRESH_COOKIE } from "./auth";

const isHttpsAppUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
const cookieSecure = process.env.COOKIE_SECURE === "1" || isHttpsAppUrl;

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: cookieSecure,
  sameSite: "Lax" as const,
};

export function setSessionCookies(
  set: any,
  access: string,
  refresh: string
): void {
  if (!set.cookie) set.cookie = {};

  set.cookie[SESSION_COOKIE] = {
    value: access,
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60,
  };

  set.cookie[REFRESH_COOKIE] = {
    value: refresh,
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60,
  };
}

export function clearSessionCookies(set: any): void {
  if (!set.cookie) set.cookie = {};

  set.cookie[SESSION_COOKIE] = { value: "" };
  set.cookie[REFRESH_COOKIE] = { value: "" };
}
