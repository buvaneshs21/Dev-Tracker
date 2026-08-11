import { guardTask, serverError } from "@/lib/task-guard";
import { createTaskLink, getTaskLinks } from "@/lib/task-links";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const guard = await guardTask(id, { write: false });
    if (!guard.ok) return guard.response;

    return Response.json({ links: await getTaskLinks(id) });
  } catch (err) {
    return serverError("links GET", err);
  }
}

export async function POST(req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    const body: unknown = await req.json().catch(() => null);
    const result = await createTaskLink(
      id,
      guard.projectId,
      guard.userId,
      body,
    );

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(
      { link: result.value, links: await getTaskLinks(id) },
      { status: 201 },
    );
  } catch (err) {
    return serverError("links POST", err);
  }
}
