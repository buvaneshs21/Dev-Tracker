import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { changePassword } from "@/lib/users";

/**
 * Changing a password requires proving you know the current one — a stolen
 * session cookie alone must not be enough to lock the owner out.
 */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await req.json().catch(() => null);
    await connectDB();

    const result = await changePassword(session.userId, body);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    // No hash, no token, nothing about the credential comes back.
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/user/password] PATCH", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
