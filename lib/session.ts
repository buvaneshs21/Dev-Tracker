import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "./auth";

/**
 * Reads the session on the server. Safe in pages, layouts and route handlers —
 * but not in proxy.ts, which has no access to next/headers and reads the cookie
 * off the request instead.
 */
export async function getSession() {
  return verifyToken((await cookies()).get(AUTH_COOKIE)?.value);
}
