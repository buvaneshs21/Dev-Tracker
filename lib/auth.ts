import jwt from "jsonwebtoken";

// Kept free of mongoose/model imports on purpose: proxy.ts pulls this in, and
// proxy runs before rendering on every matched request.

export const AUTH_COOKIE = "token";

// Seconds. Mirrors the JWT's own `expiresIn`, so the cookie and the token die
// together — otherwise the browser keeps sending a token the server rejects.
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export type Session = { userId: string };

export function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: TOKEN_MAX_AGE,
  });
}

/**
 * Returns the session for a valid, unexpired token, or null. An expired token
 * is indistinguishable from no token here — which is what drives the user back
 * to /login.
 */
export function verifyToken(token: string | undefined): Session | null {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    if (typeof decoded === "string" || !decoded.userId) return null;
    return { userId: String(decoded.userId) };
  } catch {
    // expired, tampered with, or signed under a previous JWT_SECRET
    return null;
  }
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TOKEN_MAX_AGE,
};
