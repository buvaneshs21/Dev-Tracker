import jwt from "jsonwebtoken";

import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { getAccessibleProjectIds } from "@/lib/permissions";
import {
  SOCKET_TOKEN_TTL_SECONDS,
  type SocketTokenClaims,
} from "@/lib/realtime/events";

/**
 * Issues a short-lived token the browser hands to the Socket.IO server.
 *
 * Authorisation is decided *here*, where the database and the permission layer
 * already live, and baked into the token as the list of rooms this user may
 * join. The realtime server then needs no database access at all — it verifies
 * the signature and checks the requested room against that list.
 *
 * The trade-off is staleness: revoking someone's project membership takes
 * effect on their next token refresh rather than instantly. The TTL is short
 * for that reason.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const projectIds = await getAccessibleProjectIds(session.userId);

    const claims: SocketTokenClaims = {
      userId: session.userId,
      projects: projectIds.map(String),
      // Distinguishes this from a session cookie; lib/auth.ts refuses to accept
      // any token carrying a scope as an authentication token.
      scope: "realtime",
    };

    const token = jwt.sign(claims, process.env.JWT_SECRET!, {
      expiresIn: SOCKET_TOKEN_TTL_SECONDS,
    });

    return Response.json(
      { token, expiresIn: SOCKET_TOKEN_TTL_SECONDS },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/realtime/token] GET", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
