import Project from "@/models/Project";
import User from "@/models/User";
import { getAttachments } from "./attachments";
import { getDailyUpdates, getTotalHours } from "./daily-updates";
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

  const [subtasks, updates, attachments, links, totalHours, owner, project] =
    await Promise.all([
      getSubtasks(taskId),
      getDailyUpdates(taskId),
      getAttachments(taskId),
      getTaskLinks(taskId),
      getTotalHours(taskId),
      User.findById(access.task.userId)
        .select("name")
        .lean<{ name?: string } | null>(),
      task.projectId
        ? Project.findById(task.projectId)
            .select("name color")
            .lean<{ name?: string; color?: ProjectColor } | null>()
        : Promise.resolve(null),
    ]);

  return {
    task,
    subtasks,
    updates,
    attachments,
    links,
    totalHours,
    // The task's creator is its assignee — there's no separate assignment
    // field on the model, and inventing one would be a second source of truth.
    assigneeName: owner?.name ?? "Unknown",
    projectName: project?.name ?? null,
    projectColor: project?.color ?? null,
    canEdit: access.canEdit,
    canDelete: access.canDelete,
  };
}
