import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { canManageMembers, getProjectMembership } from "@/lib/permissions";
import { removeMember, updateMemberRole } from "@/lib/members";
import { isProjectRole } from "@/lib/types";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

const notFound = () =>
  Response.json({ error: "Project not found" }, { status: 404 });

function serverError(scope: string, err: unknown) {
  console.error(`[api/projects/[id]/members/[memberId]] ${scope}`, err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

type Context = { params: Promise<{ id: string; memberId: string }> };

/** Both handlers need the same three checks before doing anything. */
async function authorize(projectId: string, userId: string) {
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) return { ok: false as const, response: notFound() };

  if (!(await canManageMembers(userId, projectId))) {
    return {
      ok: false as const,
      response: Response.json(
        { error: "You don't have permission to manage members" },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const };
}

export async function PATCH(req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id, memberId } = await params;
    await connectDB();

    const auth = await authorize(id, session.userId);
    if (!auth.ok) return auth.response;

    const body: unknown = await req.json().catch(() => null);
    const role = (body as { role?: unknown } | null)?.role;

    if (!isProjectRole(role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    const result = await updateMemberRole(id, memberId, role);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ members: result.value });
  } catch (err) {
    return serverError("PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id, memberId } = await params;
    await connectDB();

    const auth = await authorize(id, session.userId);
    if (!auth.ok) return auth.response;

    const result = await removeMember(id, memberId);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ members: result.value });
  } catch (err) {
    return serverError("DELETE", err);
  }
}
