import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import { declineInvitation } from "@/lib/invitations";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { token } = await params;
    await connectDB();

    const user = await User.findById(session.userId)
      .select("email")
      .lean<{ email?: string } | null>();

    if (!user?.email) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }

    const result = await declineInvitation(token, user.email);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/invitations/[token]/decline] POST", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
