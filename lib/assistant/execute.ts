import mongoose from "mongoose";

import Task from "@/models/Task";
import { getAnalytics } from "@/lib/analytics";
import { resolveAssignee } from "@/lib/assignment";
import { parseDueDate, parseStartDate } from "@/lib/dates";
import { getProjectMembers } from "@/lib/members";
import { getActorName, notify } from "@/lib/notifications";
import {
  canCreateTask,
  getAccessibleProjectIds,
  getProjectMembership,
  roleCan,
} from "@/lib/permissions";
import { getProjects } from "@/lib/projects";
import { emitTaskEvent } from "@/lib/realtime/emit";
import { toRealtimeTask } from "@/lib/realtime/events";
import { getTaskDetail } from "@/lib/task-detail";
import {
  effectiveAssigneeId,
  resolveTaskAccess,
  serializeTask,
} from "@/lib/tasks";
import {
  isAnalyticsRange,
  isProjectStatus,
  isTaskPriority,
  isTaskStatus,
  type TaskDTO,
} from "@/lib/types";
import { isKnownTool } from "./tools";

/**
 * Runs one tool call on behalf of the session user.
 *
 * **`userId` is a parameter of this function, never of a tool.** It comes from
 * the session cookie in the route handler and is threaded through to the same
 * permission helpers the REST API uses — `getAccessibleProjectIds`,
 * `getProjectMembership`, `resolveTaskAccess`, `canCreateTask`. The model
 * chooses *what* to look up; it has no way to express *who* is asking.
 *
 * Results are trimmed rather than passed through as DTOs. Everything returned
 * here is re-sent on every subsequent turn of the conversation, so a stray
 * field is a cost that compounds.
 */

export type ToolOutcome =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

const fail = (error: string): ToolOutcome => ({ ok: false, error });

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

/** Trimmed for the wire — the model doesn't need timestamps it can't use. */
function briefTask(task: TaskDTO, names: Map<string, string>) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    assignee: names.get(task.assigneeId) ?? null,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate?.slice(0, 10) ?? null,
    startDate: task.startDate?.slice(0, 10) ?? null,
    overdue:
      task.status !== "completed" &&
      Boolean(task.dueDate) &&
      new Date(task.dueDate!) < new Date(),
  };
}

/**
 * Display names for everyone the user shares a project with.
 *
 * Built once per tool call so a list of fifty tasks doesn't become fifty user
 * lookups, and so the model sees "Harry" instead of an ObjectId it would
 * otherwise read back to the user.
 */
async function nameMap(userId: string): Promise<Map<string, string>> {
  const projectIds = await getAccessibleProjectIds(userId);

  const lists = await Promise.all(
    projectIds.map((id) => getProjectMembers(String(id))),
  );

  const names = new Map<string, string>();
  for (const list of lists) {
    for (const member of list) names.set(member.userId, member.name);
  }

  return names;
}

export async function executeTool(
  name: string,
  rawInput: unknown,
  userId: string,
): Promise<ToolOutcome> {
  if (!isKnownTool(name)) return fail(`Unknown tool: ${name}`);

  const input = (rawInput ?? {}) as Record<string, unknown>;

  try {
    switch (name) {
      // --- reads ---------------------------------------------------------
      case "list_projects": {
        const status = asString("status" in input ? input.status : undefined);
        const projects = await getProjects(
          userId,
          isProjectStatus(status) ? { status } : {},
        );

        return {
          ok: true,
          result: projects.map((project) => ({
            id: project.id,
            name: project.name,
            status: project.status,
            role: project.role,
            progress: project.stats.progress,
            tasks: project.stats,
            members: project.memberCount,
            dueDate: project.dueDate?.slice(0, 10) ?? null,
          })),
        };
      }

      case "list_tasks": {
        const accessible = await getAccessibleProjectIds(userId);

        // Everything the user may read: their own tasks, plus anything in a
        // project they belong to. Mirrors resolveTaskAccess, in bulk.
        const filter: Record<string, unknown> = {
          $or: [
            { userId: new mongoose.Types.ObjectId(userId) },
            ...(accessible.length ? [{ projectId: { $in: accessible } }] : []),
          ],
        };

        const projectId = asString(input.projectId);
        if (projectId) {
          if (!(await getProjectMembership(userId, projectId))) {
            return fail("No such project, or you don't have access to it.");
          }
          filter.projectId = new mongoose.Types.ObjectId(projectId);
        }

        if (isTaskStatus(input.status)) filter.status = input.status;
        if (isTaskPriority(input.priority)) filter.priority = input.priority;

        const assigneeId = asString(input.assigneeId);
        if (assigneeId) {
          const target = assigneeId === "me" ? userId : assigneeId;
          if (!mongoose.Types.ObjectId.isValid(target)) {
            return fail("assigneeId must be a user id, or 'me'.");
          }
          const oid = new mongoose.Types.ObjectId(target);
          // assigneeId is null on tasks nobody has reassigned, which still
          // belong to their creator — so both spellings have to match.
          filter.$and = [
            { $or: [{ assigneeId: oid }, { assigneeId: null, userId: oid }] },
          ];
        }

        const due: Record<string, Date> = {};
        if (input.overdueOnly === true) {
          due.$lt = new Date();
          filter.status = filter.status ?? { $ne: "completed" };
        } else {
          const before = asString(input.dueBefore);
          const after = asString(input.dueAfter);

          if (before) {
            const parsed = parseDueDate(before);
            if (!parsed) return fail("dueBefore must be YYYY-MM-DD.");
            due.$lte = parsed;
          }
          if (after) {
            const parsed = parseStartDate(after);
            if (!parsed) return fail("dueAfter must be YYYY-MM-DD.");
            due.$gte = parsed;
          }
        }
        if (Object.keys(due).length) filter.dueDate = due;

        const limit = Math.min(
          Math.max(typeof input.limit === "number" ? input.limit : 50, 1),
          100,
        );

        const [rows, names] = await Promise.all([
          Task.find(filter).sort({ dueDate: 1, createdAt: -1 }).limit(limit).lean(),
          nameMap(userId),
        ]);

        const tasks = rows.map((row) => briefTask(serializeTask(row), names));

        return {
          ok: true,
          result: {
            count: tasks.length,
            truncated: tasks.length === limit,
            tasks,
          },
        };
      }

      case "get_task": {
        const taskId = asString(input.taskId);
        if (!taskId) return fail("taskId is required.");

        const detail = await getTaskDetail(taskId, userId);
        if (!detail) return fail("No such task, or you don't have access to it.");

        return {
          ok: true,
          result: {
            ...briefTask(
              detail.task,
              new Map([[detail.task.assigneeId, detail.assigneeName]]),
            ),
            description: detail.task.description || null,
            project: detail.projectName,
            createdBy: detail.creatorName,
            assignedBy: detail.assignedByName,
            hoursLogged: detail.totalHours,
            subtasks: detail.subtasks.map((s) => ({
              title: s.title,
              done: s.completed,
            })),
            // Content, author and date — enough to answer "what's the latest
            // on this" without shipping the whole log.
            updates: detail.updates.slice(0, 10).map((u) => ({
              date: u.date,
              author: u.authorName,
              content: u.content,
              blocker: u.blocker || null,
              hours: u.hoursWorked,
            })),
            links: detail.links.map((l) => ({ title: l.title, url: l.url })),
            attachments: detail.attachments.map((a) => a.fileName),
          },
        };
      }

      case "list_members": {
        const projectId = asString(input.projectId);
        if (!projectId) return fail("projectId is required.");

        // getProjectMembers assumes the caller already authorised — so do it.
        if (!(await getProjectMembership(userId, projectId))) {
          return fail("No such project, or you don't have access to it.");
        }

        const members = await getProjectMembers(projectId);

        return {
          ok: true,
          result: members.map((member) => ({
            userId: member.userId,
            name: member.name,
            role: member.role,
            isYou: member.userId === userId,
          })),
        };
      }

      case "get_analytics": {
        const range = isAnalyticsRange(input.range) ? input.range : "30d";
        const data = await getAnalytics(userId, range);

        return {
          ok: true,
          result: {
            range: data.range,
            overview: data.overview,
            byStatus: data.statuses,
            byPriority: data.priorities,
            projects: data.projects,
            overdue: data.overdueStats,
          },
        };
      }

      // --- writes --------------------------------------------------------
      // Reached only after the user confirmed. Every guard the REST routes
      // apply is applied again here — confirmation is consent, not authority.
      case "create_task": {
        const title = asString(input.title)?.trim();
        if (!title) return fail("title is required.");

        let projectId: string | null = null;
        const requested = asString(input.projectId);
        if (requested) {
          if (!(await canCreateTask(userId, requested))) {
            return fail("You can't create tasks in that project.");
          }
          projectId = requested;
        }

        let assignee = null;
        const requestedAssignee = asString(input.assigneeId);
        if (requestedAssignee) {
          assignee = await resolveAssignee(projectId, userId, requestedAssignee);
          if (!assignee) {
            return fail("That person isn't a member of this project.");
          }
        }

        const dueDate = asString(input.dueDate)
          ? parseDueDate(input.dueDate as string)
          : null;
        if (asString(input.dueDate) && !dueDate) {
          return fail("dueDate must be YYYY-MM-DD.");
        }

        const startDate = asString(input.startDate)
          ? parseStartDate(input.startDate as string)
          : null;
        if (asString(input.startDate) && !startDate) {
          return fail("startDate must be YYYY-MM-DD.");
        }

        if (startDate && dueDate && dueDate < startDate) {
          return fail("Due date cannot be before the start date.");
        }

        const handedOver = assignee && assignee.userId !== userId;

        const created = serializeTask(
          (
            await Task.create({
              title,
              description: asString(input.description)?.trim() ?? "",
              status: "pending",
              priority: isTaskPriority(input.priority) ? input.priority : "medium",
              projectId,
              assigneeId: assignee?.userId ?? null,
              assignedById: handedOver ? userId : null,
              assignedAt: handedOver ? new Date() : null,
              startDate,
              dueDate,
              completedAt: null,
              userId,
            })
          ).toObject(),
        );

        emitTaskEvent(
          { type: "TASK_CREATED", task: toRealtimeTask(created) },
          [created.assigneeId],
        );

        if (assignee) {
          const actorName = await getActorName(userId);
          await notify({
            userId: assignee.userId,
            type: "TASK_ASSIGNED",
            actorId: userId,
            actorName,
            title: `${actorName} assigned you a task`,
            body: created.title,
            taskId: created.id,
            projectId: created.projectId,
          });
        }

        return { ok: true, result: { created: briefTask(created, new Map()) } };
      }

      case "update_task": {
        const taskId = asString(input.taskId);
        if (!taskId) return fail("taskId is required.");

        const access = await resolveTaskAccess(taskId, userId);
        if (!access) return fail("No such task, or you don't have access to it.");
        if (!access.canEdit) return fail("You can't edit this task.");

        const update: Record<string, unknown> = {};

        const title = asString(input.title)?.trim();
        if ("title" in input) {
          if (!title) return fail("title can't be empty.");
          update.title = title;
        }

        if (typeof input.description === "string") {
          update.description = input.description.trim();
        }

        if ("priority" in input) {
          if (!isTaskPriority(input.priority)) return fail("Invalid priority.");
          update.priority = input.priority;
        }

        if ("status" in input) {
          if (!isTaskStatus(input.status)) return fail("Invalid status.");
          update.status = input.status;
          update.completedAt = input.status === "completed" ? new Date() : null;
        }

        for (const [key, parse] of [
          ["startDate", parseStartDate],
          ["dueDate", parseDueDate],
        ] as const) {
          if (!(key in input)) continue;

          const value = input[key];
          if (value === "" || value === null) {
            update[key] = null;
            continue;
          }

          const parsed = typeof value === "string" ? parse(value) : null;
          if (!parsed) return fail(`${key} must be YYYY-MM-DD, or empty.`);
          update[key] = parsed;
        }

        if (Object.keys(update).length === 0) return fail("Nothing to update.");

        const updated = serializeTask(
          await Task.findOneAndUpdate({ _id: taskId }, update, {
            returnDocument: "after",
          }).lean(),
        );

        const audience = [updated.assigneeId, effectiveAssigneeId(access.task)];

        emitTaskEvent(
          { type: "TASK_UPDATED", task: toRealtimeTask(updated) },
          audience,
        );

        if ("status" in update && access.task.status !== updated.status) {
          emitTaskEvent(
            {
              type: "TASK_STATUS_CHANGED",
              taskId: updated.id,
              projectId: updated.projectId ?? "",
              status: updated.status,
              updatedAt: updated.updatedAt,
            },
            audience,
          );
        }

        if (
          "status" in update &&
          access.task.status !== updated.status &&
          updated.status === "completed"
        ) {
          const actorName = await getActorName(userId);
          const recipients = new Set(
            [effectiveAssigneeId(access.task), String(access.task.userId)].filter(
              Boolean,
            ),
          );

          for (const recipient of recipients) {
            await notify({
              userId: recipient,
              type: "TASK_COMPLETED",
              actorId: userId,
              actorName,
              title: `${actorName} completed a task`,
              body: updated.title,
              taskId: updated.id,
              projectId: updated.projectId,
            });
          }
        }

        return { ok: true, result: { updated: briefTask(updated, new Map()) } };
      }

      case "assign_task": {
        const taskId = asString(input.taskId);
        const assigneeId = asString(input.assigneeId);
        if (!taskId || !assigneeId) {
          return fail("taskId and assigneeId are both required.");
        }

        const access = await resolveTaskAccess(taskId, userId);
        if (!access) return fail("No such task, or you don't have access to it.");
        if (!access.canEdit) return fail("You can't edit this task.");

        const projectId = access.task.projectId
          ? String(access.task.projectId)
          : null;

        const assignee = await resolveAssignee(
          projectId,
          String(access.task.userId),
          assigneeId,
        );
        if (!assignee) return fail("That person isn't a member of this project.");

        const previous = effectiveAssigneeId(access.task);
        if (assignee.userId === previous) {
          return { ok: true, result: { unchanged: `Already assigned to ${assignee.name}.` } };
        }

        const updated = serializeTask(
          await Task.findOneAndUpdate(
            { _id: taskId },
            {
              assigneeId: assignee.userId,
              assignedById: userId,
              assignedAt: new Date(),
            },
            { returnDocument: "after" },
          ).lean(),
        );

        emitTaskEvent({ type: "TASK_UPDATED", task: toRealtimeTask(updated) }, [
          assignee.userId,
          previous,
        ]);

        const actorName = await getActorName(userId);
        await notify({
          userId: assignee.userId,
          type: "TASK_ASSIGNED",
          actorId: userId,
          actorName,
          title: `${actorName} assigned you a task`,
          body: updated.title,
          taskId: updated.id,
          projectId: updated.projectId,
        });

        return {
          ok: true,
          result: { assigned: updated.title, to: assignee.name },
        };
      }

      default:
        return fail(`Unhandled tool: ${name}`);
    }
  } catch (err) {
    // The model sees a short reason; the stack stays on the server.
    console.error(`[assistant] tool ${name} failed`, err);
    return fail("That lookup failed. Try a different approach.");
  }
}

/** Whether this user is allowed the write tools at all. */
export async function userCanWrite(userId: string): Promise<boolean> {
  const projectIds = await getAccessibleProjectIds(userId);

  // A personal task needs no project, so anyone with an account can create one.
  if (projectIds.length === 0) return true;

  const memberships = await Promise.all(
    projectIds.map((id) => getProjectMembership(userId, String(id))),
  );

  return memberships.some(
    (membership) => membership && roleCan(membership.role, "task:create"),
  );
}
