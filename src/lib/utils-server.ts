import { SESSION_COOKIE, REFRESH_COOKIE } from "./auth";

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: true,
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
