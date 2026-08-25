import Task from "@/models/Task";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { getProjectMembership } from "@/lib/permissions";
import { serializeTask } from "@/lib/tasks";

/**
 * A project's tasks.
 *
 * Serves the polling fallback: when the socket isn't connected, clients refetch
 * this instead of sitting stale. Same authorisation as the project page — the
 * caller must own the project or belong to it.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();

    const membership = await getProjectMembership(session.userId, id);
    if (!membership) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Project-wide, not just the caller's — matches what the project page shows.
    const tasks = await Task.find({ projectId: id })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json(
      { tasks: tasks.map(serializeTask) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/projects/[id]/tasks] GET", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
