import { randomBytes } from "node:crypto";

import Project from "@/models/Project";
import ProjectInvitation from "@/models/ProjectInvitation";
import User from "@/models/User";
import { addMember, type ActionResult, type ActionStatus } from "./members";
import { getProjectMembership } from "./permissions";
import {
  isInvitableRole,
  type InvitableRole,
  type InvitationPreview,
  type InvitationStatus,
  type ProjectColor,
  type ProjectInvitationDTO,
} from "./types";

const INVITATION_TTL_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (status: ActionStatus, error: string): ActionResult<never> => ({
  ok: false,
  status,
  error,
});

type InvitationRow = {
  _id: unknown;
  projectId: unknown;
  email: string;
  role: InvitableRole;
  invitedBy: unknown;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt?: Date;
};

/**
 * Where the invite lives. Kept as a plain function rather than baked into an
 * email template so a notification/email layer can be added later without
 * touching invitation logic.
 */
export function invitationPath(token: string): string {
  return `/invitations/${token}`;
}

/** Tokens are only ever surfaced outside production — see the API routes. */
export const isProduction = () => process.env.NODE_ENV === "production";

function serializeInvitation(
  row: InvitationRow,
  invitedByName: string | null,
): ProjectInvitationDTO {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    email: row.email,
    role: row.role,
    status: row.status,
    invitedByName,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function createInvitation(
  projectId: string,
  rawEmail: unknown,
  rawRole: unknown,
  invitedBy: string,
): Promise<ActionResult<{ invitation: ProjectInvitationDTO; token: string }>> {
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email || !EMAIL_PATTERN.test(email)) {
    return fail(400, "Enter a valid email address");
  }

  if (!isInvitableRole(rawRole)) {
    return fail(400, "Pick a role of admin, member or viewer");
  }

  const project = await Project.findById(projectId)
    .select("ownerId name")
    .lean<{ ownerId: unknown; name?: string } | null>();

  if (!project) return fail(404, "Project not found");

  // If the address already belongs to an account, check membership up front so
  // the inviter gets a clear message instead of a dead invitation.
  const existingUser = await User.findOne({ email })
    .select("_id")
    .lean<{ _id: unknown } | null>();

  if (existingUser) {
    const membership = await getProjectMembership(
      String(existingUser._id),
      projectId,
    );
    if (membership) return fail(409, "That person is already a member");
  }

  const pending = await ProjectInvitation.findOne({
    projectId,
    email,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).lean<InvitationRow | null>();

  if (pending) {
    return fail(409, "An invitation is already pending for that address");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

  const created = await ProjectInvitation.create({
    projectId,
    email,
    role: rawRole,
    invitedBy,
    token,
    status: "pending",
    expiresAt,
  });

  const inviter = await User.findById(invitedBy)
    .select("name")
    .lean<{ name?: string } | null>();

  return {
    ok: true,
    value: {
      invitation: serializeInvitation(
        created.toObject() as InvitationRow,
        inviter?.name ?? null,
      ),
      token,
    },
  };
}

/** Pending, unexpired invitations for a project — shown beside the member list. */
export async function getPendingInvitations(
  projectId: string,
): Promise<ProjectInvitationDTO[]> {
  const rows = await ProjectInvitation.find({
    projectId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean<InvitationRow[]>();

  if (rows.length === 0) return [];

  const inviters = await User.find({
    _id: { $in: rows.map((row) => row.invitedBy) },
  })
    .select("name")
    .lean<{ _id: unknown; name?: string }[]>();

  const byId = new Map(inviters.map((user) => [String(user._id), user.name]));

  return rows.map((row) =>
    serializeInvitation(row, byId.get(String(row.invitedBy)) ?? null),
  );
}

type LoadedInvitation = { row: InvitationRow; preview: InvitationPreview };

/**
 * Looks an invitation up by token and lazily marks it expired.
 *
 * Returns the preview shape only — the token is never echoed back, and neither
 * is the inviter's email or the project id beyond what the page needs.
 */
export async function getInvitationByToken(
  token: string,
): Promise<LoadedInvitation | null> {
  if (!token || token.length < 16) return null;

  const row = await ProjectInvitation.findOne({
    token,
  }).lean<InvitationRow | null>();

  if (!row) return null;

  let status = row.status;

  if (status === "pending" && row.expiresAt.getTime() < Date.now()) {
    status = "expired";
    await ProjectInvitation.updateOne(
      { _id: row._id },
      { $set: { status: "expired" } },
    );
  }

  const [project, inviter] = await Promise.all([
    Project.findById(row.projectId)
      .select("name color")
      .lean<{ name?: string; color?: ProjectColor } | null>(),
    User.findById(row.invitedBy).select("name").lean<{ name?: string } | null>(),
  ]);

  if (!project) return null;

  return {
    row: { ...row, status },
    preview: {
      projectName: project.name ?? "Untitled project",
      projectColor: project.color ?? "indigo",
      invitedByName: inviter?.name ?? "A DevTrack user",
      email: row.email,
      role: row.role,
      status,
      expiresAt: row.expiresAt.toISOString(),
    },
  };
}

function guardRedeemable(row: InvitationRow): ActionResult<never> | null {
  if (row.status === "accepted") return fail(409, "Invitation already accepted");
  if (row.status === "declined") return fail(409, "Invitation already declined");
  if (row.status === "expired") return fail(410, "This invitation has expired");
  if (row.expiresAt.getTime() < Date.now()) {
    return fail(410, "This invitation has expired");
  }
  return null;
}

export async function acceptInvitation(
  token: string,
  userId: string,
  userEmail: string,
): Promise<ActionResult<{ projectId: string }>> {
  const loaded = await getInvitationByToken(token);
  if (!loaded) return fail(404, "Invitation not found");

  const guard = guardRedeemable(loaded.row);
  if (guard) return guard;

  // The invitation is addressed to an email — holding the link isn't enough.
  if (loaded.row.email !== userEmail.trim().toLowerCase()) {
    return fail(
      403,
      `This invitation was sent to ${loaded.row.email}. Sign in with that account to accept it.`,
    );
  }

  const projectId = String(loaded.row.projectId);
  const added = await addMember(projectId, userId, loaded.row.role);

  // Already a member: settle the invitation rather than leaving it dangling.
  if (!added.ok && added.status !== 409) return added;

  await ProjectInvitation.updateOne(
    { _id: loaded.row._id },
    { $set: { status: "accepted" } },
  );

  // Tell whoever sent the invitation that it landed. Imported lazily so this
  // module keeps no static dependency on the notification layer.
  const { getActorName, notify } = await import("./notifications");
  const [actorName, project] = await Promise.all([
    getActorName(userId),
    Project.findById(projectId)
      .select("name")
      .lean<{ name?: string } | null>(),
  ]);

  await notify({
    userId: String(loaded.row.invitedBy),
    type: "MEMBER_JOINED",
    actorId: userId,
    actorName,
    title: `${actorName} joined ${project?.name ?? "your project"}`,
    body: "They accepted your invitation.",
    projectId,
  });

  return { ok: true, value: { projectId } };
}

export async function declineInvitation(
  token: string,
  userEmail: string,
): Promise<ActionResult> {
  const loaded = await getInvitationByToken(token);
  if (!loaded) return fail(404, "Invitation not found");

  const guard = guardRedeemable(loaded.row);
  if (guard) return guard;

  if (loaded.row.email !== userEmail.trim().toLowerCase()) {
    return fail(403, "This invitation was sent to a different address");
  }

  await ProjectInvitation.updateOne(
    { _id: loaded.row._id },
    { $set: { status: "declined" } },
  );

  return { ok: true, value: undefined };
}
