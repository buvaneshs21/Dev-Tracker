import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import { acceptInvitation } from "@/lib/invitations";

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

    // The invitee's email comes from their account, never from the request —
    // otherwise anyone holding the link could claim any invitation.
    const user = await User.findById(session.userId)
      .select("email")
      .lean<{ email?: string } | null>();

    if (!user?.email) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }

    const result = await acceptInvitation(token, session.userId, user.email);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ ok: true, projectId: result.value.projectId });
  } catch (err) {
    console.error("[api/invitations/[token]/accept] POST", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
