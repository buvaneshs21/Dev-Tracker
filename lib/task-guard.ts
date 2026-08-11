import { connectDB } from "./mongodb";
import { getSession } from "./session";
import { resolveTaskAccess } from "./tasks";

type Guarded = {
  ok: true;
  userId: string;
  taskId: string;
  projectId: string | null;
  canEdit: boolean;
  canDelete: boolean;
};

type Rejected = { ok: false; response: Response };

export type TaskGuard = Guarded | Rejected;

const json = (body: unknown, status: number) =>
  Response.json(body, { status });

/**
 * The single authorisation path for every task sub-resource.
 *
 * Written once because subtasks, daily updates, attachments and links all need
 * exactly the same three checks, and eight hand-written copies is eight chances
 * to forget one. Access is resolved from the session — ownership of the task,
 * or a role on its project — never from anything in the request body.
 *
 * A task the caller can't see is reported as missing, not forbidden, so ids
 * can't be probed.
 */
export async function guardTask(
  taskId: string,
  { write }: { write: boolean },
): Promise<TaskGuard> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: json({ error: "Unauthorized" }, 401) };
  }

  await connectDB();

  const access = await resolveTaskAccess(taskId, session.userId);
  if (!access) {
    return { ok: false, response: json({ error: "Task not found" }, 404) };
  }

  if (write && !access.canEdit) {
    return {
      ok: false,
      response: json(
        { error: "You don't have permission to change this task" },
        403,
      ),
    };
  }

  return {
    ok: true,
    userId: session.userId,
    taskId,
    projectId: access.task.projectId ? String(access.task.projectId) : null,
    canEdit: access.canEdit,
    canDelete: access.canDelete,
  };
}

export function serverError(scope: string, err: unknown): Response {
  console.error(`[api] ${scope}`, err);
  return json({ error: "Something went wrong" }, 500);
}
