import { connectDB } from "@/lib/mongodb";
import { getInvitationByToken } from "@/lib/invitations";

/**
 * Readable without a session: someone following an invite link may not be
 * signed in yet. Only the preview is returned — never the token, the project
 * id, or anything about the project beyond its name and colour.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    await connectDB();

    const loaded = await getInvitationByToken(token);
    if (!loaded) {
      return Response.json({ error: "Invitation not found" }, { status: 404 });
    }

    return Response.json(loaded.preview);
  } catch (err) {
    console.error("[api/invitations/[token]] GET", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
