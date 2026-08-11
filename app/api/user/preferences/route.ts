import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { getUserPreferences, updateUserPreferences } from "@/lib/preferences";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

function serverError(scope: string, err: unknown) {
  console.error(`[api/user/preferences] ${scope}`, err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    await connectDB();
    return Response.json(await getUserPreferences(session.userId));
  } catch (err) {
    return serverError("GET", err);
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body: unknown = await req.json().catch(() => null);
    await connectDB();

    const result = await updateUserPreferences(session.userId, body);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.value);
  } catch (err) {
    return serverError("PATCH", err);
  }
}
