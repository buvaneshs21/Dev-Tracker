import { guardTask, serverError } from "@/lib/task-guard";
import {
  deleteDailyUpdate,
  getDailyUpdates,
  updateDailyUpdate,
} from "@/lib/daily-updates";

type Context = { params: Promise<{ id: string; updateId: string }> };

export async function PATCH(req: Request, { params }: Context) {
  try {
    const { id, updateId } = await params;
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    const body: unknown = await req.json().catch(() => null);

    // The service enforces author-only editing on top of task access.
    const result = await updateDailyUpdate(id, updateId, guard.userId, body);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({
      update: result.value,
      updates: await getDailyUpdates(id),
    });
  } catch (err) {
    return serverError("update PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  try {
    const { id, updateId } = await params;
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    // Authors delete their own; task owners and project admins can moderate.
    const result = await deleteDailyUpdate(
      id,
      updateId,
      guard.userId,
      guard.canDelete,
    );

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ updates: await getDailyUpdates(id) });
  } catch (err) {
    return serverError("update DELETE", err);
  }
}
