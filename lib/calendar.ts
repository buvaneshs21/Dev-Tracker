import mongoose from "mongoose";

import Task from "@/models/Task";
import Project from "@/models/Project";
import { dayKey, startOfDay } from "./dates";
import type {
  CalendarEvent,
  ProjectColor,
  TaskPriority,
  TaskStatus,
  UpcomingTask,
} from "./types";
import { myTasksFilter, serializeTask } from "./tasks";
import { getAccessibleProjectIds } from "./permissions";

type TaskRow = {
  _id: unknown;
  title?: string | null;
  description?: string | null;
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  projectId?: unknown;
  startDate?: Date | null;
  dueDate?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  completedAt?: Date | null;
};

type ProjectRow = {
  _id: unknown;
  name?: string | null;
  color?: ProjectColor | null;
  dueDate?: Date | null;
};

type ProjectLookup = Map<string, { name: string; color: ProjectColor }>;

function buildProjectLookup(projects: ProjectRow[]): ProjectLookup {
  return new Map(
    projects.map((project) => [
      String(project._id),
      { name: project.name ?? "Untitled", color: project.color ?? "indigo" },
    ]),
  );
}

/** A task is overdue only if it has a due date in the past and isn't done. */
function isOverdue(due: Date, status: TaskStatus | null | undefined): boolean {
  return status !== "completed" && due.getTime() < Date.now();
}

/**
 * Task and project events inside a date range, for one user.
 *
 * Both queries are scoped by the authenticated user (`userId` for tasks,
 * `ownerId` for projects) and by the range, so paging through months never
 * loads the whole collection.
 */
export async function getCalendarEvents(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalendarEvent[]> {
  const owner = new mongoose.Types.ObjectId(userId);
  const mine = await myTasksFilter(userId);

  const [tasks, projects] = await Promise.all([
    Task.find({
      // `mine` already contains an $or, so the date window goes in $and
      // rather than a second $or key that would overwrite it.
      $and: [
        mine,
        {
          $or: [
            { dueDate: { $gte: rangeStart, $lte: rangeEnd } },
            { startDate: { $gte: rangeStart, $lte: rangeEnd } },
          ],
        },
      ],
    })
      .select("title status priority projectId startDate dueDate")
      .lean<TaskRow[]>(),

    // One query for both the deadline events and the colour lookup — a user
    // has few projects, so a second round trip isn't worth it.
    Project.find({ ownerId: owner })
      .select("name color dueDate")
      .lean<ProjectRow[]>(),
  ]);

  const lookup = buildProjectLookup(projects);
  const events: CalendarEvent[] = [];

  for (const task of tasks) {
    const taskId = String(task._id);
    const project = task.projectId
      ? lookup.get(String(task.projectId))
      : undefined;

    const shared = {
      type: "task" as const,
      title: task.title ?? "Untitled task",
      taskId,
      projectId: task.projectId ? String(task.projectId) : null,
      projectName: project?.name ?? null,
      projectColor: project?.color ?? null,
      status: task.status ?? "pending",
      priority: task.priority ?? "medium",
    };

    if (task.dueDate) {
      const due = new Date(task.dueDate);
      if (due >= rangeStart && due <= rangeEnd) {
        events.push({
          ...shared,
          id: `task-due-${taskId}`,
          kind: "due",
          dayKey: dayKey(due),
          date: due.toISOString(),
          overdue: isOverdue(due, task.status),
        });
      }
    }

    if (task.startDate) {
      const start = new Date(task.startDate);
      if (start >= rangeStart && start <= rangeEnd) {
        events.push({
          ...shared,
          id: `task-start-${taskId}`,
          kind: "start",
          dayKey: dayKey(start),
          date: start.toISOString(),
          // A start date can't be overdue — only a deadline can.
          overdue: false,
        });
      }
    }
  }

  for (const project of projects) {
    if (!project.dueDate) continue;

    const due = new Date(project.dueDate);
    if (due < rangeStart || due > rangeEnd) continue;

    const projectId = String(project._id);

    events.push({
      id: `project-${projectId}`,
      type: "project",
      kind: "deadline",
      title: project.name ?? "Untitled project",
      dayKey: dayKey(due),
      date: due.toISOString(),
      taskId: null,
      projectId,
      projectName: project.name ?? null,
      projectColor: project.color ?? "indigo",
      status: null,
      priority: null,
      overdue: false,
    });
  }

  events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.type.localeCompare(b.type) ||
      a.title.localeCompare(b.title),
  );

  return events;
}

async function findTasksByDue(
  userId: string,
  range: Record<string, Date>,
  sort: 1 | -1,
  limit: number,
): Promise<UpcomingTask[]> {
  // The same "mine" rule the dashboard uses: the effective assignee, not the
  // creator. A task handed to you in someone else's project is your work.
  const mine = await myTasksFilter(userId);

  const tasks = await Task.find({
    ...mine,
    status: { $ne: "completed" },
    dueDate: range,
  })
    .sort({ dueDate: sort })
    .limit(limit)
    .lean<TaskRow[]>();

  if (tasks.length === 0) return [];

  const projectIds = [
    ...new Set(
      tasks
        .filter((task) => task.projectId)
        .map((task) => String(task.projectId)),
    ),
  ];

  // Scoped to projects the user can actually reach. Ownership alone is too
  // narrow now that tasks assigned inside someone else's project appear here:
  // the name would resolve to nothing and the row would render as "no
  // project". Membership is the right boundary, and it is the same one that
  // let the task through in the first place.
  const accessible = await getAccessibleProjectIds(userId);
  const reachable = new Set(accessible.map(String));

  const visibleIds = projectIds.filter((id) => reachable.has(id));

  const projects =
    visibleIds.length > 0
      ? await Project.find({ _id: { $in: visibleIds } })
          .select("name color")
          .lean<ProjectRow[]>()
      : [];

  const lookup = buildProjectLookup(projects);

  return tasks.map((task) => {
    const project = task.projectId
      ? lookup.get(String(task.projectId))
      : undefined;

    return {
      ...serializeTask(task),
      projectName: project?.name ?? null,
      projectColor: project?.color ?? null,
    };
  });
}

/** The next few open tasks with a deadline, soonest first. */
export function getUpcomingTasks(
  userId: string,
  limit = 5,
): Promise<UpcomingTask[]> {
  return findTasksByDue(userId, { $gte: startOfDay(new Date()) }, 1, limit);
}

/** Open tasks whose deadline has already passed, most recent first. */
export function getOverdueTasks(
  userId: string,
  limit = 5,
): Promise<UpcomingTask[]> {
  return findTasksByDue(userId, { $lt: startOfDay(new Date()) }, -1, limit);
}
