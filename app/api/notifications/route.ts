import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { getNotificationFeed, markRead } from "@/lib/notifications";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

/**
 * The bell panel's feed.
 *
 * Always scoped to the session user — there is no way to ask for anyone else's,
 * because no user id is accepted from the request.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    await connectDB();

    return Response.json(await getNotificationFeed(session.userId), {
      // Always fresh: a cached unread count is a wrong unread count.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/notifications] GET", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/** Marks one notification read (`{ id }`) or the whole feed (`{ all: true }`). */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body: unknown = await req.json().catch(() => null);
  const input = (body ?? {}) as Record<string, unknown>;

  const id =
    typeof input.id === "string" && input.id !== "" ? input.id : null;

  if (!id && input.all !== true) {
    return Response.json(
      { error: "Provide an id, or all: true" },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    // markRead scopes by userId, so an id belonging to someone else simply
    // matches nothing — it can't be used to probe for existence.
    return Response.json(await markRead(session.userId, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/notifications] PATCH", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
