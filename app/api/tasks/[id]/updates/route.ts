import { guardTask, serverError } from "@/lib/task-guard";
import { createDailyUpdate, getDailyUpdates } from "@/lib/daily-updates";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const guard = await guardTask(id, { write: false });
    if (!guard.ok) return guard.response;

    return Response.json({ updates: await getDailyUpdates(id) });
  } catch (err) {
    return serverError("updates GET", err);
  }
}

export async function POST(req: Request, { params }: Context) {
  try {
    const { id } = await params;
    // Logging work is a write — viewers can read the log but not add to it.
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    const body: unknown = await req.json().catch(() => null);

    // userId and projectId come from the guard, never from the body.
    const result = await createDailyUpdate(
      id,
      guard.projectId,
      guard.userId,
      body,
    );

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(
      { update: result.value, updates: await getDailyUpdates(id) },
      { status: 201 },
    );
  } catch (err) {
    return serverError("updates POST", err);
  }
}
