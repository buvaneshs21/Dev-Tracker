import { createServer } from "node:http";

import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import {
  projectRoom,
  userRoom,
  type EmitEnvelope,
  type SocketTokenClaims,
} from "../lib/realtime/events.ts";

/**
 * Standalone Socket.IO relay.
 *
 * Deliberately dumb: it holds no database connection and makes no
 * authorisation decisions of its own. The Next app decides which projects a
 * user may join and signs that list into a short-lived token; this server only
 * verifies the signature and checks the requested room against the list. That
 * keeps the always-on process small, stateless and free of database
 * credentials.
 *
 * Run with:  npm run realtime
 */

const PORT = Number(process.env.REALTIME_PORT ?? 4001);
const JWT_SECRET = process.env.JWT_SECRET;
const EMIT_SECRET = process.env.REALTIME_EMIT_SECRET;
const ORIGIN = process.env.REALTIME_ALLOWED_ORIGIN ?? "http://localhost:3000";

if (!JWT_SECRET) {
  console.error("JWT_SECRET is required — it verifies socket tokens.");
  process.exit(1);
}

if (!EMIT_SECRET) {
  console.error(
    "REALTIME_EMIT_SECRET is required — without it anyone could POST /emit.",
  );
  process.exit(1);
}

const httpServer = createServer((req, res) => {
  // Health check, so a platform can tell whether the process is alive.
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, sockets: io.engine.clientsCount }));
    return;
  }

  if (req.method === "POST" && req.url === "/emit") {
    // Server-to-server only. The secret never reaches a browser.
    if (req.headers["x-emit-secret"] !== EMIT_SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // A relay has no reason to accept a large payload.
      if (body.length > 64_000) req.destroy();
    });

    req.on("end", () => {
      try {
        const { room, channel, payload } = JSON.parse(body) as EmitEnvelope;

        if (typeof room !== "string" || typeof channel !== "string") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid envelope" }));
          return;
        }

        // The relay reads the address and forwards the contents unopened. It
        // has no idea what a task or a notification is, which is why adding a
        // new kind of event never requires redeploying this process.
        io.to(room).emit(channel, payload);

        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid envelope" }));
      }
    });

    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  cors: { origin: ORIGIN, credentials: true },
  // Long-poll fallback for networks that block upgrades.
  transports: ["websocket", "polling"],
});

/** Verified once per connection; the claims then live on the socket. */
type SocketData = { userId: string; projects: Set<string> };

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (typeof token !== "string" || !token) {
    next(new Error("unauthorized"));
    return;
  }

  try {
    const claims = jwt.verify(token, JWT_SECRET) as SocketTokenClaims;

    // Anything without the realtime scope is a session cookie, not a socket
    // token, and must not be accepted here.
    if (claims.scope !== "realtime" || !claims.userId) {
      next(new Error("unauthorized"));
      return;
    }

    // userId comes from the signed token, never from handshake.auth.userId.
    const data = socket.data as SocketData;
    data.userId = claims.userId;
    data.projects = new Set(claims.projects ?? []);

    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const data = socket.data as SocketData;

  // Personal room, joined unconditionally. No gate is needed or possible: the
  // id came out of the verified token, so a socket can only ever land in its
  // own room. This is what makes notifications reach you on every open tab.
  socket.join(userRoom(data.userId));

  socket.on("project:join", (projectId: unknown, ack?: (ok: boolean) => void) => {
    if (typeof projectId !== "string" || !data.projects.has(projectId)) {
      // Not a member — no room, no data, no explanation.
      ack?.(false);
      return;
    }

    socket.join(projectRoom(projectId));
    ack?.(true);
  });

  socket.on("project:leave", (projectId: unknown) => {
    if (typeof projectId === "string") {
      socket.leave(projectRoom(projectId));
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`realtime server listening on :${PORT} (origin ${ORIGIN})`);
});
