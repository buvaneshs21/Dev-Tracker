import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import {
  createProject,
  getProjects,
  validateDateOrder,
  validateProjectInput,
  type ProjectInput,
} from "@/lib/projects";
import { isProjectStatus } from "@/lib/types";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

/** Never let a driver or validation stack trace reach the client. */
function serverError(scope: string, err: unknown) {
  console.error(`[api/projects] ${scope}`, err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    await connectDB();

    const url = new URL(req.url);
    const search = url.searchParams.get("q")?.trim() || undefined;
    const statusParam = url.searchParams.get("status");
    const status = isProjectStatus(statusParam) ? statusParam : undefined;

    const projects = await getProjects(session.userId, { search, status });

    return Response.json(projects);
  } catch (err) {
    return serverError("GET", err);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body: unknown = await req.json().catch(() => null);

    const parsed = validateProjectInput(body, { partial: false });
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const input = parsed.value as ProjectInput;

    const order = validateDateOrder(input.startDate, input.dueDate);
    if (!order.ok) {
      return Response.json({ error: order.error }, { status: 400 });
    }

    await connectDB();

    // ownerId is taken from the session inside createProject — anything the
    // client sent for it is ignored.
    const project = await createProject(session.userId, input);

    return Response.json(project, { status: 201 });
  } catch (err) {
    return serverError("POST", err);
  }
}
