import { guardTask, serverError } from "@/lib/task-guard";
import { createSubtask, getSubtasks } from "@/lib/subtasks";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const guard = await guardTask(id, { write: false });
    if (!guard.ok) return guard.response;

    return Response.json({ subtasks: await getSubtasks(id) });
  } catch (err) {
    return serverError("subtasks GET", err);
  }
}

export async function POST(req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    const body: unknown = await req.json().catch(() => null);
    const result = await createSubtask(id, body);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(
      { subtask: result.value, subtasks: await getSubtasks(id) },
      { status: 201 },
    );
  } catch (err) {
    return serverError("subtasks POST", err);
  }
}
