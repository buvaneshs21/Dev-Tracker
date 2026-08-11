import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { canManageMembers, getProjectMembership } from "@/lib/permissions";
import { getProjectMembers } from "@/lib/members";
import {
  createInvitation,
  getPendingInvitations,
  invitationPath,
  isProduction,
} from "@/lib/invitations";

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

/** Non-members get "not found" rather than "forbidden" — a 403 confirms the id. */
const notFound = () =>
  Response.json({ error: "Project not found" }, { status: 404 });

function serverError(scope: string, err: unknown) {
  console.error(`[api/projects/[id]/members] ${scope}`, err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    await connectDB();

    const membership = await getProjectMembership(session.userId, id);
    if (!membership) return notFound();

    const [members, invitations] = await Promise.all([
      getProjectMembers(id),
      // Pending invites are management detail — only shown to those who manage.
      canManageMembers(session.userId, id).then((allowed) =>
        allowed ? getPendingInvitations(id) : [],
      ),
    ]);

    return Response.json({ members, invitations, role: membership.role });
  } catch (err) {
    return serverError("GET", err);
  }
}

export async function POST(req: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    await connectDB();

    const membership = await getProjectMembership(session.userId, id);
    if (!membership) return notFound();

    if (!(await canManageMembers(session.userId, id))) {
      return Response.json(
        { error: "You don't have permission to invite members" },
        { status: 403 },
      );
    }

    const body: unknown = await req.json().catch(() => null);
    const input = (body ?? {}) as Record<string, unknown>;

    const result = await createInvitation(
      id,
      input.email,
      input.role,
      session.userId,
    );

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(
      {
        invitation: result.value.invitation,
        invitations: await getPendingInvitations(id),
        // The token is a credential. Outside production it's returned so the
        // flow is testable without email infrastructure; in production the
        // link belongs in an email, never in an API response.
        devLink: isProduction() ? null : invitationPath(result.value.token),
      },
      { status: 201 },
    );
  } catch (err) {
    return serverError("POST", err);
  }
}
