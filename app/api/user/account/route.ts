import { cookies } from "next/headers";

import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { AUTH_COOKIE } from "@/lib/auth";
import { deleteAccount, getDeletionBlockers } from "@/lib/users";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

function serverError(scope: string, err: unknown) {
  console.error(`[api/user/account] ${scope}`, err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

/** Lets the Danger Zone warn about shared projects before anything is typed. */
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    await connectDB();
    return Response.json({ blockers: await getDeletionBlockers(session.userId) });
  } catch (err) {
    return serverError("GET", err);
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body: unknown = await req.json().catch(() => null);
    const confirmEmail = (body as { confirmEmail?: unknown } | null)
      ?.confirmEmail;

    await connectDB();

    // Always the session's own account — there is no id parameter to tamper
    // with, so one user can never delete another.
    const result = await deleteAccount(session.userId, confirmEmail);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    // The account is gone; the cookie must not outlive it.
    (await cookies()).delete(AUTH_COOKIE);

    return Response.json({ ok: true, deleted: result.value });
  } catch (err) {
    return serverError("DELETE", err);
  }
}
