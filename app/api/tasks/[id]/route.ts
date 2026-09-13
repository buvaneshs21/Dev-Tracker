import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import { getSession } from "@/lib/session";
import { effectiveAssigneeId, resolveTaskAccess, serializeTask } from "@/lib/tasks";
import { parseDueDate, parseStartDate } from "@/lib/dates";
import { canCreateTask } from "@/lib/permissions";
import { resolveAssignee, type Assignee } from "@/lib/assignment";
import { deleteAttachmentsForTask } from "@/lib/attachments";
import { deleteSubtasksForTask } from "@/lib/subtasks";
import { deleteUpdatesForTask } from "@/lib/daily-updates";
import { deleteLinksForTask } from "@/lib/task-links";
import {
  deleteNotificationsForTask,
  getActorName,
  notify,
} from "@/lib/notifications";
import { emitTaskEvent } from "@/lib/realtime/emit";
import { toRealtimeTask } from "@/lib/realtime/events";
import { isTaskPriority, isTaskStatus } from "@/lib/types";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

const forbidden = (error: string) => Response.json({ error }, { status: 403 });

const badRequest = (error: string) => Response.json({ error }, { status: 400 });

type Context = { params: Promise<{ id: string }> };

/**
 * A single task, for the detail page's polling fallback.
 *
 * Returns the same 404 for "gone" and "not yours", so task ids can't be probed.
 * The client treats either as "no longer available", which is true both ways.
 */
export async function GET(_req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  try {
    await connectDB();

    const access = await resolveTaskAccess(id, session.userId);
    if (!access) return notFound();

    return Response.json(serializeTask(access.task), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/tasks/[id]] GET", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

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

  // Validated against the *destination* project, which a PATCH may be changing
  // in the same request — assigning to a member of the project you're moving
  // away from would be wrong.
  const destinationProjectId =
    "projectId" in update
      ? (update.projectId as string | null)
      : access.task.projectId
        ? String(access.task.projectId)
        : null;

  let newAssignee: Assignee | null = null;

  if ("assigneeId" in input) {
    if (typeof input.assigneeId !== "string" || !input.assigneeId) {
      return badRequest("Invalid assignee");
    }

    newAssignee = await resolveAssignee(
      destinationProjectId,
      String(access.task.userId),
      input.assigneeId,
    );

    if (!newAssignee) {
      return badRequest("That person isn't a member of this project");
    }

    update.assigneeId = newAssignee.userId;

    // Stamped only on a real change of hands. Re-selecting the current assignee
    // shouldn't rewrite the record of who assigned it, or when.
    if (newAssignee.userId !== effectiveAssigneeId(access.task)) {
      update.assignedById = session.userId;
      update.assignedAt = new Date();
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

  const updated = serializeTask(task);

  // After the write, never before. A task moved between projects notifies both
  // rooms, so it leaves one list and joins the other.
  const previousProjectId = access.task.projectId
    ? String(access.task.projectId)
    : null;

  // Both sides of a handover need telling: the task joins one dashboard as it
  // leaves the other. Deduped inside emitTaskEvent when they are the same
  // person.
  const priorAssignee = effectiveAssigneeId(access.task);
  const audience = [updated.assigneeId, priorAssignee];

  if (previousProjectId && previousProjectId !== updated.projectId) {
    emitTaskEvent({
      type: "TASK_DELETED",
      taskId: updated.id,
      projectId: previousProjectId,
    });
  }

  emitTaskEvent({ type: "TASK_UPDATED", task: toRealtimeTask(updated) }, audience);

  // A status change also gets its own narrower event, so a board can move a
  // card without diffing the whole task.
  if ("status" in update && access.task.status !== updated.status) {
    emitTaskEvent(
      {
        type: "TASK_STATUS_CHANGED",
        taskId: updated.id,
        projectId: updated.projectId ?? "",
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
      audience,
    );
  }

  // --- notifications -------------------------------------------------------
  // Awaited, not fired and forgotten: a serverless function can be frozen the
  // moment it responds, and a dropped promise here would silently lose the
  // notification. notify() never throws, so this can't fail the request.

  const previousAssigneeId = effectiveAssigneeId(access.task);

  if (newAssignee && newAssignee.userId !== previousAssigneeId) {
    const actorName = await getActorName(session.userId);

    await notify({
      userId: newAssignee.userId,
      type: "TASK_ASSIGNED",
      actorId: session.userId,
      actorName,
      title: `${actorName} assigned you a task`,
      body: updated.title,
      taskId: updated.id,
      projectId: updated.projectId,
    });
  }

  const justCompleted =
    "status" in update &&
    access.task.status !== updated.status &&
    updated.status === "completed";

  if (justCompleted) {
    // Both the person it was for and the person who raised it want to know.
    // Deduped, so a task someone created for themselves notifies once — and
    // notify() then drops whichever recipient is the actor, which on a solo
    // task is everybody.
    const assigned = newAssignee?.userId ?? previousAssigneeId;
    const recipients = new Set(
      [assigned, String(access.task.userId)].filter(Boolean),
    );

    const actorName = await getActorName(session.userId);

    for (const recipient of recipients) {
      await notify({
        userId: recipient,
        type: "TASK_COMPLETED",
        actorId: session.userId,
        actorName,
        title: `${actorName} completed a task`,
        body: updated.title,
        taskId: updated.id,
        projectId: updated.projectId,
      });
    }
  }

  return Response.json(updated);
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
    // A bell entry that navigates to a 404 is worse than no entry at all.
    deleteNotificationsForTask(id),
  ]);

  // Captured before the delete — afterwards there's nothing to read it from.
  const projectId = access.task.projectId
    ? String(access.task.projectId)
    : null;
  const deletedAssignee = effectiveAssigneeId(access.task);

  await Task.deleteOne({ _id: id });

  // Captured before the delete, so the person it belonged to still hears it.
  emitTaskEvent(
    { type: "TASK_DELETED", taskId: id, projectId: projectId ?? "" },
    [deletedAssignee],
  );

  return Response.json({ ok: true });
}
