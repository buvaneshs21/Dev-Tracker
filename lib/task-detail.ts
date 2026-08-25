import Project from "@/models/Project";
import User from "@/models/User";
import { getAttachments } from "./attachments";
import { getDailyUpdates, getTotalHours } from "./daily-updates";
import { getProjectMembers } from "./members";
import { getSubtasks } from "./subtasks";
import { getTaskLinks } from "./task-links";
import { resolveTaskAccess, serializeTask } from "./tasks";
import type { ProjectColor, TaskDetailData } from "./types";

/**
 * Everything the task detail page renders, in one authorised pass.
 *
 * Access is resolved once, up front, and every sub-resource is then loaded for
 * that already-authorised task — so no individual loader has to re-derive
 * permission, and none of them can disagree about it.
 */
export async function getTaskDetail(
  taskId: string,
  userId: string,
): Promise<TaskDetailData | null> {
  const access = await resolveTaskAccess(taskId, userId);
  if (!access) return null;

  const task = serializeTask(access.task);

  const [
    subtasks,
    updates,
    attachments,
    links,
    totalHours,
    creator,
    assignee,
    assignedBy,
    project,
    members,
  ] = await Promise.all([
    getSubtasks(taskId),
    getDailyUpdates(taskId),
    getAttachments(taskId),
    getTaskLinks(taskId),
    getTotalHours(taskId),
    User.findById(access.task.userId)
      .select("name")
      .lean<{ name?: string } | null>(),
    // Resolved from the DTO, which already falls back to the creator for tasks
    // that predate assignment — so this is one lookup, not a conditional.
    User.findById(task.assigneeId)
      .select("name")
      .lean<{ name?: string } | null>(),
    // Null on anything nobody has reassigned, which is most tasks.
    task.assignedById
      ? User.findById(task.assignedById)
          .select("name")
          .lean<{ name?: string } | null>()
      : Promise.resolve(null),
    task.projectId
      ? Project.findById(task.projectId)
          .select("name color")
          .lean<{ name?: string; color?: ProjectColor } | null>()
      : Promise.resolve(null),
    // The picker's options. Safe to load unconditionally: reaching this point
    // already means the viewer has access to the task, and therefore to its
    // project. A task with no project has nobody to hand it to.
    task.projectId ? getProjectMembers(task.projectId) : Promise.resolve([]),
  ]);

  return {
    task,
    subtasks,
    updates,
    attachments,
    links,
    totalHours,
    assigneeName: assignee?.name ?? "Unknown",
    creatorName: creator?.name ?? "Unknown",
    assignedByName: assignedBy?.name ?? null,
    assignableMembers: members,
    projectName: project?.name ?? null,
    projectColor: project?.color ?? null,
    canEdit: access.canEdit,
    canDelete: access.canDelete,
  };
}
