import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import {
  deleteProject,
  getProjectById,
  updateProject,
  validateDateOrder,
  validateProjectInput,
} from "@/lib/projects";
import { canDeleteProject, canEditProject } from "@/lib/permissions";

/** Distinct from notFound: the caller can see the project but not do this. */
const forbidden = (error: string) => Response.json({ error }, { status: 403 });

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

/** A project owned by someone else is reported as missing, not forbidden —
 *  a 403 would confirm the id exists. */
const notFound = () =>
  Response.json({ error: "Project not found" }, { status: 404 });

function serverError(scope: string, err: unknown) {
  console.error(`[api/projects/[id]] ${scope}`, err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    await connectDB();

    const project = await getProjectById(id, session.userId);
    if (!project) return notFound();

    return Response.json(project);
  } catch (err) {
    return serverError("GET", err);
  }
}

export async function PATCH(req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const body: unknown = await req.json().catch(() => null);

    const parsed = validateProjectInput(body, { partial: true });
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    if (Object.keys(parsed.value).length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    await connectDB();

    // Load first so the date-order rule is checked against the merged result:
    // a PATCH that only moves dueDate must still be compared to the stored
    // startDate.
    const existing = await getProjectById(id, session.userId);
    if (!existing) return notFound();

    // Members and viewers can see a project without being able to change it.
    if (!(await canEditProject(session.userId, id))) {
      return forbidden("You don't have permission to edit this project");
    }

    const startDate =
      "startDate" in parsed.value
        ? (parsed.value.startDate ?? null)
        : existing.startDate
          ? new Date(existing.startDate)
          : null;

    const dueDate =
      "dueDate" in parsed.value
        ? (parsed.value.dueDate ?? null)
        : existing.dueDate
          ? new Date(existing.dueDate)
          : null;

    const order = validateDateOrder(startDate, dueDate);
    if (!order.ok) {
      return Response.json({ error: order.error }, { status: 400 });
    }

    const project = await updateProject(id, session.userId, parsed.value);
    if (!project) return notFound();

    return Response.json(project);
  } catch (err) {
    return serverError("PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    await connectDB();

    const existing = await getProjectById(id, session.userId);
    if (!existing) return notFound();

    // Deleting is owner-only — an admin can edit but not destroy.
    if (!(await canDeleteProject(session.userId, id))) {
      return forbidden("Only the project owner can delete it");
    }

    const result = await deleteProject(id, session.userId);
    if (!result.deleted) return notFound();

    // Tasks are detached, not deleted — see deleteProject for the reasoning.
    return Response.json({ ok: true, detachedTasks: result.detachedTasks });
  } catch (err) {
    return serverError("DELETE", err);
  }
}
