import type { ProjectPermission, ProjectRole } from "./types";

/**
 * The authorisation matrix, and nothing else.
 *
 * Deliberately free of model/mongoose imports so client components can ask
 * "should I render this button?" without pulling the MongoDB driver into the
 * browser bundle. The database-backed checks live in lib/permissions.ts, which
 * is server-only and reads its rules from here — one table, two consumers.
 *
 * Members lack `task:delete`: they can create and edit work inside a project,
 * but destroying someone else's task is an owner/admin action. A member can
 * still delete a task they own — that path is authorised by task ownership,
 * not by project role.
 */
export const ROLE_PERMISSIONS: Record<ProjectRole, readonly ProjectPermission[]> =
  {
    owner: [
      "project:view",
      "project:edit",
      "project:delete",
      "members:manage",
      "task:create",
      "task:edit",
      "task:delete",
    ],
    admin: [
      "project:view",
      "project:edit",
      "members:manage",
      "task:create",
      "task:edit",
      "task:delete",
    ],
    member: ["project:view", "task:create", "task:edit"],
    viewer: ["project:view"],
  };

export function roleCan(
  role: ProjectRole,
  permission: ProjectPermission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
