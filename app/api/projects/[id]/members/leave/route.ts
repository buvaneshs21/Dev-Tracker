import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { leaveProject } from "@/lib/members";

/**
 * Self-service exit. Deliberately separate from DELETE /members/[memberId],
 * which requires members:manage — leaving needs no such permission, only that
 * you are the one leaving.
 */
export async function POST(
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

    const result = await leaveProject(id, session.userId);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/projects/[id]/members/leave] POST", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
