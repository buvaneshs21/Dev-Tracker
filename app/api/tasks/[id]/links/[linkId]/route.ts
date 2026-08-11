import { guardTask, serverError } from "@/lib/task-guard";
import { deleteTaskLink, getTaskLinks } from "@/lib/task-links";

type Context = { params: Promise<{ id: string; linkId: string }> };

export async function DELETE(_req: Request, { params }: Context) {
  try {
    const { id, linkId } = await params;
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    const result = await deleteTaskLink(id, linkId);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ links: await getTaskLinks(id) });
  } catch (err) {
    return serverError("link DELETE", err);
  }
}
