import { connectDB } from "@/lib/mongodb";
import { getDashboardSummary } from "@/lib/dashboard";
import { DATABASE_UNREACHABLE, isDatabaseUnreachable } from "@/lib/db-error";
import { getSession } from "@/lib/session";

/**
 * The dashboard's live slice: counters, upcoming and overdue.
 *
 * Called when a task event arrives and on a slow timer when no socket is
 * available. It takes no parameters at all — the scope comes entirely from the
 * session cookie — so there is nothing a client could send to widen it.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    return Response.json(await getDashboardSummary(session.userId), {
      // A cached counter is a wrong counter.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/dashboard/summary] GET", err);

    if (isDatabaseUnreachable(err)) {
      return Response.json({ error: DATABASE_UNREACHABLE }, { status: 503 });
    }

    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
