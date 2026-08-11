import mongoose from "mongoose";

import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";
import User from "@/models/User";
import { getProjectMembership } from "./permissions";
import {
  PROJECT_ROLES,
  type InvitableRole,
  type ProjectMemberDTO,
  type ProjectRole,
} from "./types";

/** Uniform failure shape so route handlers map straight to a status code. */
export type ActionStatus = 400 | 403 | 404 | 409 | 410 | 500;

export type ActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; status: ActionStatus; error: string };

const fail = (status: ActionStatus, error: string): ActionResult<never> => ({
  ok: false,
  status,
  error,
});

const ROLE_ORDER: Record<ProjectRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
};

type MemberRow = {
  _id: unknown;
  userId: unknown;
  role: ProjectRole;
  joinedAt?: Date | null;
  createdAt?: Date | null;
};

/**
 * Guarantees the owner has a membership row.
 *
 * Projects created before collaboration existed have no rows at all, and the
 * owner is derived from Project.ownerId. Calling this on read backfills them
 * lazily instead of requiring a migration.
 */
export async function ensureOwnerMembership(projectId: string): Promise<void> {
  const project = await Project.findById(projectId)
    .select("ownerId createdAt")
    .lean<{ ownerId: unknown; createdAt?: Date } | null>();

  if (!project) return;

  await ProjectMember.updateOne(
    { projectId, userId: project.ownerId },
    {
      $set: { role: "owner" },
      $setOnInsert: { joinedAt: project.createdAt ?? new Date() },
    },
    { upsert: true },
  );
}

/** Members of a project, owner first. Assumes the caller already authorised. */
export async function getProjectMembers(
  projectId: string,
): Promise<ProjectMemberDTO[]> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return [];

  await ensureOwnerMembership(projectId);

  const rows = await ProjectMember.find({ projectId }).lean<MemberRow[]>();
  if (rows.length === 0) return [];

  const users = await User.find({
    _id: { $in: rows.map((row) => row.userId) },
  })
    .select("name email")
    .lean<{ _id: unknown; name?: string; email?: string }[]>();

  const byId = new Map(users.map((user) => [String(user._id), user]));

  return rows
    .map((row) => {
      const user = byId.get(String(row.userId));

      return {
        id: String(row._id),
        userId: String(row.userId),
        name: user?.name ?? "Unknown user",
        email: user?.email ?? "",
        role: row.role,
        joinedAt: (row.joinedAt ?? row.createdAt ?? new Date()).toISOString(),
      };
    })
    .sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        a.joinedAt.localeCompare(b.joinedAt),
    );
}

/** Member counts for many projects at once, for the project cards. */
export async function getMemberCounts(
  projectIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (projectIds.length === 0) return counts;

  const rows = await ProjectMember.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        projectId: {
          $in: projectIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    { $group: { _id: "$projectId", count: { $sum: 1 } } },
  ]);

  for (const row of rows) counts.set(String(row._id), row.count);

  // A project with no rows yet still has its owner.
  for (const id of projectIds) if (!counts.has(id)) counts.set(id, 1);

  return counts;
}

/**
 * How many distinct people the user shares a project with, excluding
 * themselves. Powers the dashboard's collaboration line.
 */
export async function getCollaboratorCount(userId: string): Promise<number> {
  const { getAccessibleProjectIds } = await import("./permissions");
  const projectIds = await getAccessibleProjectIds(userId);
  if (projectIds.length === 0) return 0;

  const rows = await ProjectMember.aggregate<{ _id: null; people: unknown[] }>([
    {
      $match: {
        projectId: { $in: projectIds },
        userId: { $ne: new mongoose.Types.ObjectId(userId) },
      },
    },
    { $group: { _id: null, people: { $addToSet: "$userId" } } },
  ]);

  return rows[0]?.people.length ?? 0;
}

/** Adds a user to a project. Idempotent-safe: a duplicate is reported, not thrown. */
export async function addMember(
  projectId: string,
  userId: string,
  role: InvitableRole,
): Promise<ActionResult<{ memberId: string }>> {
  const existing = await getProjectMembership(userId, projectId);
  if (existing) return fail(409, "That user is already a member");

  try {
    const member = await ProjectMember.create({
      projectId,
      userId,
      role,
      joinedAt: new Date(),
    });

    return { ok: true, value: { memberId: String(member._id) } };
  } catch (err) {
    // The unique index is the real guard against a race between two accepts.
    if ((err as { code?: number }).code === 11000) {
      return fail(409, "That user is already a member");
    }
    throw err;
  }
}

async function loadMember(
  projectId: string,
  memberId: string,
): Promise<MemberRow | null> {
  if (!mongoose.Types.ObjectId.isValid(memberId)) return null;

  return ProjectMember.findOne({
    _id: memberId,
    projectId,
  }).lean<MemberRow | null>();
}

export async function updateMemberRole(
  projectId: string,
  memberId: string,
  role: ProjectRole,
): Promise<ActionResult<ProjectMemberDTO[]>> {
  if (!PROJECT_ROLES.includes(role)) return fail(400, "Invalid role");
  if (role === "owner") {
    return fail(403, "Ownership can't be assigned from here");
  }

  const member = await loadMember(projectId, memberId);
  if (!member) return fail(404, "Member not found");

  const project = await Project.findById(projectId)
    .select("ownerId")
    .lean<{ ownerId: unknown } | null>();

  if (!project) return fail(404, "Project not found");

  // The owner's role is defined by Project.ownerId — demoting it here would
  // leave the project with no owner.
  if (String(project.ownerId) === String(member.userId)) {
    return fail(403, "The project owner's role can't be changed");
  }

  await ProjectMember.updateOne({ _id: memberId, projectId }, { $set: { role } });

  return { ok: true, value: await getProjectMembers(projectId) };
}

export async function removeMember(
  projectId: string,
  memberId: string,
): Promise<ActionResult<ProjectMemberDTO[]>> {
  const member = await loadMember(projectId, memberId);
  if (!member) return fail(404, "Member not found");

  const project = await Project.findById(projectId)
    .select("ownerId")
    .lean<{ ownerId: unknown } | null>();

  if (!project) return fail(404, "Project not found");

  if (String(project.ownerId) === String(member.userId)) {
    return fail(403, "The project owner can't be removed");
  }

  // Removes the membership only — the user's account and their own tasks are
  // untouched.
  await ProjectMember.deleteOne({ _id: memberId, projectId });

  return { ok: true, value: await getProjectMembers(projectId) };
}

/** Self-service exit. The owner has nowhere to hand the project to in V1. */
export async function leaveProject(
  projectId: string,
  userId: string,
): Promise<ActionResult> {
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) return fail(404, "You're not a member of this project");

  if (membership.isOwner) {
    return fail(
      403,
      "The owner can't leave a project. Transfer ownership first.",
    );
  }

  await ProjectMember.deleteOne({ projectId, userId });

  return { ok: true, value: undefined };
}
