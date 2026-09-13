import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import { getSession } from "@/lib/session";
import { serializeTask } from "@/lib/tasks";
import { parseDueDate, parseStartDate } from "@/lib/dates";
import { canCreateTask } from "@/lib/permissions";
import { resolveAssignee, type Assignee } from "@/lib/assignment";
import { getActorName, notify } from "@/lib/notifications";
import { emitTaskEvent } from "@/lib/realtime/emit";
import { toRealtimeTask } from "@/lib/realtime/events";
import { isTaskPriority, isTaskStatus } from "@/lib/types";

// The proxy gates the pages, but direct API calls bypass it — every handler
// re-checks the session itself.
const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  await connectDB();

  const tasks = await Task.find({ userId: session.userId })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json(tasks.map(serializeTask));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body: unknown = await req.json().catch(() => null);
  const input = (body ?? {}) as Record<string, unknown>;

  const title = typeof input.title === "string" ? input.title.trim() : "";

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const status = isTaskStatus(input.status) ? input.status : "pending";
  const priority = isTaskPriority(input.priority) ? input.priority : "medium";

  let dueDate: Date | null = null;
  if (typeof input.dueDate === "string" && input.dueDate !== "") {
    dueDate = parseDueDate(input.dueDate);
    if (!dueDate) {
      return Response.json({ error: "Invalid due date" }, { status: 400 });
    }
  }

  let startDate: Date | null = null;
  if (typeof input.startDate === "string" && input.startDate !== "") {
    startDate = parseStartDate(input.startDate);
    if (!startDate) {
      return Response.json({ error: "Invalid start date" }, { status: 400 });
    }
  }

  if (startDate && dueDate && dueDate < startDate) {
    return Response.json(
      { error: "Due date cannot be before the start date" },
      { status: 400 },
    );
  }

  await connectDB();

  // A projectId from the client is only honoured once we've confirmed the
  // session user may create tasks there — otherwise it's a way to file tasks
  // into someone else's workspace. Viewers fail this check.
  let projectId: string | null = null;
  if (typeof input.projectId === "string" && input.projectId !== "") {
    if (!(await canCreateTask(session.userId, input.projectId))) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    projectId = input.projectId;
  }

  // Optional at creation: omitting it leaves assigneeId null, which resolves to
  // the creator — the behaviour every task had before assignment existed.
  let assignee: Assignee | null = null;
  if (typeof input.assigneeId === "string" && input.assigneeId !== "") {
    assignee = await resolveAssignee(projectId, session.userId, input.assigneeId);
    if (!assignee) {
      return Response.json(
        { error: "That person isn't a member of this project" },
        { status: 400 },
      );
    }
  }

  // Fields listed explicitly so a caller can't set userId or anything else.
  const task = await Task.create({
    title,
    description:
      typeof input.description === "string" ? input.description.trim() : "",
    status,
    priority,
    projectId,
    assigneeId: assignee?.userId ?? null,
    // Only when the task was handed to someone else at creation — assigning to
    // yourself isn't a handover worth recording.
    assignedById:
      assignee && assignee.userId !== session.userId ? session.userId : null,
    assignedAt:
      assignee && assignee.userId !== session.userId ? new Date() : null,
    startDate,
    dueDate,
    completedAt: status === "completed" ? new Date() : null,
    userId: session.userId,
  });

  const created = serializeTask(task.toObject());

  // Emitted only after the write succeeded. The assignee is listed as a
  // recipient so it reaches their dashboard even when the task has no project
  // — and therefore no project room.
  emitTaskEvent(
    { type: "TASK_CREATED", task: toRealtimeTask(created) },
    [created.assigneeId],
  );

  // Awaited rather than dropped: a serverless function can be frozen as soon as
  // it responds. notify() no-ops when you assigned it to yourself.
  if (assignee) {
    const actorName = await getActorName(session.userId);

    await notify({
      userId: assignee.userId,
      type: "TASK_ASSIGNED",
      actorId: session.userId,
      actorName,
      title: `${actorName} assigned you a task`,
      body: created.title,
      taskId: created.id,
      projectId: created.projectId,
    });
  }

  return Response.json(created, { status: 201 });
}
