import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import { getSession } from "@/lib/session";
import { resolveTaskAccess, serializeTask } from "@/lib/tasks";
import { parseDueDate, parseStartDate } from "@/lib/dates";
import { canCreateTask } from "@/lib/permissions";
import { deleteAttachmentsForTask } from "@/lib/attachments";
import { deleteSubtasksForTask } from "@/lib/subtasks";
import { deleteUpdatesForTask } from "@/lib/daily-updates";
import { deleteLinksForTask } from "@/lib/task-links";
import { isTaskPriority, isTaskStatus } from "@/lib/types";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

const forbidden = (error: string) => Response.json({ error }, { status: 403 });

const badRequest = (error: string) => Response.json({ error }, { status: 400 });

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  // params is a promise as of Next 15 — awaiting it is required, not optional.
  const { id } = await params;

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Invalid body");

  const input = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if (typeof input.title === "string") {
    const title = input.title.trim();
    if (!title) return badRequest("Title is required");
    update.title = title;
  }

  if (typeof input.description === "string") {
    update.description = input.description.trim();
  }

  if ("priority" in input) {
    if (!isTaskPriority(input.priority)) return badRequest("Invalid priority");
    update.priority = input.priority;
  }

  for (const [key, parse] of [
    ["startDate", parseStartDate],
    ["dueDate", parseDueDate],
  ] as const) {
    if (!(key in input)) continue;

    const value = input[key];
    if (value === null || value === "") {
      update[key] = null;
    } else if (typeof value === "string") {
      const parsed = parse(value);
      if (!parsed) {
        return badRequest(`Invalid ${key === "dueDate" ? "due" : "start"} date`);
      }
      update[key] = parsed;
    } else {
      return badRequest(`Invalid ${key === "dueDate" ? "due" : "start"} date`);
    }
  }

  if ("status" in input) {
    if (!isTaskStatus(input.status)) return badRequest("Invalid status");
    update.status = input.status;
    // Keep completedAt in lockstep with status, in both directions — reopening
    // a task must clear the stamp or it stays counted in the chart.
    update.completedAt = input.status === "completed" ? new Date() : null;
  }

  await connectDB();

  // Ownership *or* project membership, resolved before anything is written.
  const access = await resolveTaskAccess(id, session.userId);
  if (!access) return notFound();
  if (!access.canEdit) {
    return forbidden("You don't have permission to edit this task");
  }

  if ("projectId" in input) {
    if (input.projectId === null || input.projectId === "") {
      // Explicit detach — "No project".
      update.projectId = null;
    } else if (typeof input.projectId === "string") {
      // Must be able to file tasks into the *destination* project too.
      if (!(await canCreateTask(session.userId, input.projectId))) {
        return notFound();
      }
      update.projectId = input.projectId;
    } else {
      return badRequest("Invalid project");
    }
  }

  if (Object.keys(update).length === 0) return badRequest("Nothing to update");

  // Check date order against the merged result: a PATCH that only moves one
  // date must still be compared to the stored value of the other.
  if ("startDate" in update || "dueDate" in update) {
    const start =
      "startDate" in update
        ? (update.startDate as Date | null)
        : (access.task.startDate ?? null);
    const due =
      "dueDate" in update
        ? (update.dueDate as Date | null)
        : (access.task.dueDate ?? null);

    if (start && due && due < start) {
      return badRequest("Due date cannot be before the start date");
    }
  }

  const task = await Task.findOneAndUpdate({ _id: id }, update, {
    returnDocument: "after",
  }).lean();

  if (!task) return notFound();

  return Response.json(serializeTask(task));
}

export async function DELETE(_req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  await connectDB();

  const access = await resolveTaskAccess(id, session.userId);
  if (!access) return notFound();
  if (!access.canDelete) {
    return forbidden("You don't have permission to delete this task");
  }

  // Children first, so a failure part-way leaves orphaned rows rather than
  // records pointing at a task that no longer exists. Attachments go through
  // the service so their stored bytes are removed too, not just the metadata.
  await deleteAttachmentsForTask(id);
  await Promise.all([
    deleteSubtasksForTask(id),
    deleteUpdatesForTask(id),
    deleteLinksForTask(id),
  ]);

  await Task.deleteOne({ _id: id });

  return Response.json({ ok: true });
}
