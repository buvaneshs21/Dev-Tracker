import mongoose from "mongoose";

import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";
import type { ProjectPermission, ProjectRole } from "./types";

// The matrix lives in lib/roles.ts, which imports no models — this file is
// server-only, and re-exports it so callers have one obvious import.
export { ROLE_PERMISSIONS, roleCan } from "./roles";
import { roleCan } from "./roles";

export type Membership = {
  projectId: string;
  userId: string;
  role: ProjectRole;
  isOwner: boolean;
};

/**
 * Resolves what a user is to a project, or null if nothing.
 *
 * `Project.ownerId` stays the source of truth for ownership: the owner resolves
 * to `owner` whether or not a membership row exists. That keeps projects
 * created before this feature working without a migration, and makes it
 * impossible to end up with two owners.
 */
export async function getProjectMembership(
  userId: string,
  projectId: string,
): Promise<Membership | null> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;

  const project = await Project.findById(projectId)
    .select("ownerId")
    .lean<{ _id: unknown; ownerId: unknown } | null>();

  if (!project) return null;

  if (String(project.ownerId) === String(userId)) {
    return { projectId, userId, role: "owner", isOwner: true };
  }

  const membership = await ProjectMember.findOne({ projectId, userId })
    .select("role")
    .lean<{ role: ProjectRole } | null>();

  if (!membership) return null;

  // A stale "owner" row can never out-rank Project.ownerId.
  const role = membership.role === "owner" ? "admin" : membership.role;

  return { projectId, userId, role, isOwner: false };
}

/** True when the user holds the permission on that project. */
export async function can(
  userId: string,
  projectId: string,
  permission: ProjectPermission,
): Promise<boolean> {
  const membership = await getProjectMembership(userId, projectId);
  return membership ? roleCan(membership.role, permission) : false;
}

export const canViewProject = (userId: string, projectId: string) =>
  can(userId, projectId, "project:view");

export const canEditProject = (userId: string, projectId: string) =>
  can(userId, projectId, "project:edit");

export const canDeleteProject = (userId: string, projectId: string) =>
  can(userId, projectId, "project:delete");

export const canManageMembers = (userId: string, projectId: string) =>
  can(userId, projectId, "members:manage");

export const canCreateTask = (userId: string, projectId: string) =>
  can(userId, projectId, "task:create");

export const canEditTask = (userId: string, projectId: string) =>
  can(userId, projectId, "task:edit");

export const canDeleteTask = (userId: string, projectId: string) =>
  can(userId, projectId, "task:delete");

/**
 * Every project id the user can see: owned plus joined. Used to widen the
 * project list without widening it to the whole collection.
 */
export async function getAccessibleProjectIds(
  userId: string,
): Promise<mongoose.Types.ObjectId[]> {
  const owner = new mongoose.Types.ObjectId(userId);

  const [owned, joined] = await Promise.all([
    Project.find({ ownerId: owner }).select("_id").lean<{ _id: unknown }[]>(),
    ProjectMember.find({ userId: owner })
      .select("projectId")
      .lean<{ projectId: unknown }[]>(),
  ]);

  const ids = new Set<string>();
  for (const project of owned) ids.add(String(project._id));
  for (const row of joined) ids.add(String(row.projectId));

  return [...ids].map((id) => new mongoose.Types.ObjectId(id));
}
