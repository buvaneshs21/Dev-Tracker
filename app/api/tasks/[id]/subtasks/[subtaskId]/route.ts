import { guardTask, serverError } from "@/lib/task-guard";
import { deleteSubtask, getSubtasks, updateSubtask } from "@/lib/subtasks";

type Context = { params: Promise<{ id: string; subtaskId: string }> };

export async function PATCH(req: Request, { params }: Context) {
  try {
    const { id, subtaskId } = await params;
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    const body: unknown = await req.json().catch(() => null);
    const result = await updateSubtask(id, subtaskId, body);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({
      subtask: result.value,
      subtasks: await getSubtasks(id),
    });
  } catch (err) {
    return serverError("subtask PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  try {
    const { id, subtaskId } = await params;
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    const result = await deleteSubtask(id, subtaskId);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ subtasks: await getSubtasks(id) });
  } catch (err) {
    return serverError("subtask DELETE", err);
  }
}
