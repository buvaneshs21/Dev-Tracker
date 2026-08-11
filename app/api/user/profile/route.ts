import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { getUserProfile, updateUserProfile } from "@/lib/users";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

function serverError(scope: string, err: unknown) {
  console.error(`[api/user/profile] ${scope}`, err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    await connectDB();

    // The id comes from the session cookie — there is no route parameter and
    // no body field that could point at another account.
    const profile = await getUserProfile(session.userId);
    if (!profile) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json(profile);
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

    const result = await updateUserProfile(session.userId, body);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.value);
  } catch (err) {
    return serverError("PATCH", err);
  }
}
