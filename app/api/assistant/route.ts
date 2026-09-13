import type { Content } from "@google/genai";

import User from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { DATABASE_UNREACHABLE, isDatabaseUnreachable } from "@/lib/db-error";
import { getSession } from "@/lib/session";
import { runAssistant } from "@/lib/assistant/chat";

/**
 * The assistant endpoint.
 *
 * The conversation lives on the client and is posted back each turn, which is
 * how a stateless generation API works. That's safe here because the client
 * can't gain anything by forging it: every tool re-resolves permissions from
 * the session cookie when it runs, and a confirmed write is re-authorised at
 * execution time. A tampered history can mislead the model about what it
 * already saw; it cannot reach data the user couldn't otherwise read.
 *
 * The browser sends `message` as plain text and treats `history` as opaque, so
 * nothing about the provider's message format reaches the client.
 */

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

const badRequest = (error: string) => Response.json({ error }, { status: 400 });

/** Long enough for several tool round-trips on a slow database. */
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Invalid body");

  const input = body as Record<string, unknown>;

  const history = Array.isArray(input.history) ? (input.history as Content[]) : [];

  const message =
    typeof input.message === "string" && input.message.trim() !== ""
      ? input.message.trim()
      : undefined;

  const resume =
    input.confirm && typeof input.confirm === "object"
      ? { approved: (input.confirm as Record<string, unknown>).approved === true }
      : undefined;

  if (!message && !resume) {
    return badRequest("message is required");
  }

  // Guards the free tier as much as the server: a runaway client would
  // otherwise resend an ever-growing history until the quota is gone.
  if (history.length > 60) {
    return badRequest("This conversation is too long. Start a new one.");
  }

  if (message && message.length > 2000) {
    return badRequest("That question is too long.");
  }

  try {
    await connectDB();

    const account = await User.findById(session.userId)
      .select("name")
      .lean<{ name?: string } | null>();

    // Newline-delimited JSON rather than formal SSE: the client reads this
    // with fetch(), not EventSource, so there's nothing to gain from event
    // names and a `\n`-split is far simpler than parsing SSE frames.
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
        };

        try {
          const result = await runAssistant(
            {
              userId: session.userId,
              userName: account?.name || "there",
              history,
              message,
              resume,
            },
            {
              onText: (delta) => send({ type: "text", delta }),
              onTool: (names) => send({ type: "tool", names }),
            },
          );

          send(
            result.status === "error"
              ? { type: "error", error: result.error }
              : { type: result.status, ...result },
          );
        } catch (err) {
          console.error("[api/assistant] stream", err);

          send({
            type: "error",
            error: isDatabaseUnreachable(err)
              ? DATABASE_UNREACHABLE
              : "Something went wrong.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        // Stops a reverse proxy holding the whole body before forwarding it,
        // which would defeat the point of streaming.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[api/assistant] POST", err);

    // Worth distinguishing: the assistant reads the database on every tool
    // call, so it's the first thing to break when the cluster is unreachable —
    // and "Something went wrong" sends people looking for a bug in the wrong
    // place.
    if (isDatabaseUnreachable(err)) {
      return Response.json({ error: DATABASE_UNREACHABLE }, { status: 503 });
    }

    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
