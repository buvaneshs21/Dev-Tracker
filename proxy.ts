import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

// Routes a signed-in user should never see — they get bounced to the dashboard.
const GUEST_ONLY = ["/", "/login", "/signup"];

// Routes that require a valid, unexpired token.
const PROTECTED = [
  "/dashboard",
  "/tasks",
  "/projects",
  "/calendar",
  "/analytics",
  "/settings",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get(AUTH_COOKIE)?.value;
  const session = verifyToken(tokenCookie);

  const isGuestOnly = GUEST_ONLY.includes(pathname);
  const isProtected = PROTECTED.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Signed in: the landing page, login and signup are all off-limits.
  if (session && isGuestOnly) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // No valid session on a protected route: back to login. This is the *only*
  // path that sends someone to /login, so an expired token is what triggers it.
  if (!session && isProtected) {
    const response = NextResponse.redirect(new URL("/login", request.url));

    // A token that failed verification is dead weight — drop it so the browser
    // stops sending it and the user isn't stuck re-failing the same check.
    if (tokenCookie) response.cookies.delete(AUTH_COOKIE);

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals, and static metadata files.
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
