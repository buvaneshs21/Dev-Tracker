import mongoose from "mongoose";

import Task from "@/models/Task";
// Date maths lives in one place — lib/dates.ts — so the calendar, the charts
// and the API all bucket days the same way.
import {
  addDays,
  dayKey,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "./dates";
import type { TaskDTO, TaskPriority, TaskStatus } from "./types";

type RawTask = {
  _id: unknown;
  title?: string | null;
  description?: string | null;
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  /** Absent on tasks created before projects existed. */
  projectId?: unknown;
  startDate?: Date | null;
  dueDate?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  completedAt?: Date | null;
};

/** Mongoose documents can't cross the server/client boundary — flatten them. */
export function serializeTask(doc: RawTask): TaskDTO {
  return {
    id: String(doc._id),
    title: doc.title ?? "",
    description: doc.description ?? "",
    status: doc.status ?? "pending",
    priority: doc.priority ?? "medium",
    projectId: doc.projectId ? String(doc.projectId) : null,
    startDate: doc.startDate ? new Date(doc.startDate).toISOString() : null,
    dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString() : null,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
    completedAt: doc.completedAt
      ? new Date(doc.completedAt).toISOString()
      : null,
  };
}

export type TaskAccess = {
  task: RawTask & { userId: unknown; projectId?: unknown };
  canEdit: boolean;
  canDelete: boolean;
};

/**
 * Resolves whether a user may touch a task, and how.
 *
 * Two routes to access, in priority order:
 *  1. It's their own task — full control, exactly as before collaboration.
 *  2. It belongs to a project they're a member of — then their project role
 *     decides. Viewers get read-only; members can edit but not delete someone
 *     else's task.
 *
 * Returns null for "no access", which every caller turns into a 404 rather than
 * a 403, so task ids can't be probed.
 */
export async function resolveTaskAccess(
  taskId: string,
  userId: string,
): Promise<TaskAccess | null> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return null;

  const task = await Task.findById(taskId).lean<
    (RawTask & { userId: unknown }) | null
  >();

  if (!task) return null;

  if (String(task.userId) === String(userId)) {
    return { task, canEdit: true, canDelete: true };
  }

  if (!task.projectId) return null;

  const { getProjectMembership, roleCan } = await import("./permissions");
  const membership = await getProjectMembership(
    userId,
    String(task.projectId),
  );

  if (!membership) return null;

  return {
    task,
    canEdit: roleCan(membership.role, "task:edit"),
    canDelete: roleCan(membership.role, "task:delete"),
  };
}

/** Neutralises regex metacharacters so a search for "c++" isn't a syntax error. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------

export type SeriesPoint = { key: string; label: string; count: number };
export type SeriesRange = "daily" | "weekly" | "monthly";
export type ProductivitySeries = Record<SeriesRange, SeriesPoint[]>;

export type StatDelta = {
  percent: number;
  direction: "up" | "down" | "flat";
  caption: string;
};

export type DashboardData = {
  counts: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  totalDelta: StatDelta | null;
  completedDelta: StatDelta | null;
  series: ProductivitySeries;
  weeklyGoal: { target: number; done: number };
  todayTasks: TaskDTO[];
  recent: TaskDTO[];
};

/**
 * Percent change against the previous period. Returns null when there is no
 * meaningful comparison to draw — showing "0%" or "+100%" off an empty
 * baseline would read as data when it isn't.
 */
function toDelta(
  current: number,
  previous: number,
  caption: string,
): StatDelta | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { percent: 100, direction: "up", caption };

  const change = Math.round(((current - previous) / previous) * 100);

  return {
    percent: Math.abs(change),
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    caption,
  };
}

function bucketDaily(dates: Date[], days: number): SeriesPoint[] {
  const start = addDays(startOfDay(new Date()), -(days - 1));
  const counts = new Map<string, number>();
  const points: SeriesPoint[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    const key = dayKey(date);
    counts.set(key, 0);
    points.push({
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      count: 0,
    });
  }

  for (const date of dates) {
    const key = dayKey(date);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return points.map((point) => ({ ...point, count: counts.get(point.key) ?? 0 }));
}

function bucketWeekly(dates: Date[], weeks: number): SeriesPoint[] {
  const thisWeek = startOfWeek(new Date());
  const counts = new Map<string, number>();
  const points: SeriesPoint[] = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const date = addDays(thisWeek, -i * 7);
    const key = dayKey(date);
    counts.set(key, 0);
    points.push({
      key,
      label: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      count: 0,
    });
  }

  for (const date of dates) {
    const key = dayKey(startOfWeek(date));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return points.map((point) => ({ ...point, count: counts.get(point.key) ?? 0 }));
}

function bucketMonthly(dates: Date[], months: number): SeriesPoint[] {
  const now = new Date();
  const counts = new Map<string, number>();
  const points: SeriesPoint[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = dayKey(date);
    counts.set(key, 0);
    points.push({
      key,
      label: date.toLocaleDateString("en-US", { month: "short" }),
      count: 0,
    });
  }

  for (const date of dates) {
    const key = dayKey(startOfMonth(date));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return points.map((point) => ({ ...point, count: counts.get(point.key) ?? 0 }));
}

type StatusCountRow = { _id: TaskStatus; count: number };
type GoalRow = { target: number; done: number };

/**
 * Everything the dashboard renders, in one pass. The completion history is
 * fetched once (six months of `completedAt`) and bucketed three ways in memory
 * rather than issuing a query per chart tab.
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const owner = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const last7 = addDays(startOfDay(now), -6);
  const prev7 = addDays(startOfDay(now), -13);
  const historyStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    statusRows,
    createdThisWeek,
    createdLastWeek,
    completions,
    goalRows,
    todayRows,
    recentRows,
  ] = await Promise.all([
    Task.aggregate<StatusCountRow>([
      { $match: { userId: owner } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    Task.countDocuments({ userId: owner, createdAt: { $gte: last7 } }),
    Task.countDocuments({
      userId: owner,
      createdAt: { $gte: prev7, $lt: last7 },
    }),

    Task.find({ userId: owner, completedAt: { $gte: historyStart } })
      .select("completedAt")
      .lean<{ completedAt: Date }[]>(),

    Task.aggregate<GoalRow>([
      {
        $match: {
          userId: owner,
          dueDate: { $gte: weekStart, $lt: weekEnd },
        },
      },
      {
        $group: {
          _id: null,
          target: { $sum: 1 },
          done: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]),

    // Soonest deadline first, undated last — a plain sort on dueDate would put
    // the undated tasks at the top.
    Task.aggregate<RawTask>([
      { $match: { userId: owner, status: { $ne: "completed" } } },
      {
        $addFields: {
          dueSort: { $ifNull: ["$dueDate", new Date(8640000000000000)] },
        },
      },
      { $sort: { dueSort: 1, createdAt: -1 } },
      { $limit: 5 },
    ]),

    Task.find({ userId: owner })
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean<RawTask[]>(),
  ]);

  const byStatus = (status: TaskStatus) =>
    statusRows.find((row) => row._id === status)?.count ?? 0;

  const pending = byStatus("pending");
  const inProgress = byStatus("in-progress");
  const completed = byStatus("completed");

  const completedDates = completions.map((row) => new Date(row.completedAt));
  const completedThisWeek = completedDates.filter(
    (date) => date >= last7,
  ).length;
  const completedLastWeek = completedDates.filter(
    (date) => date >= prev7 && date < last7,
  ).length;

  return {
    counts: {
      total: pending + inProgress + completed,
      pending,
      inProgress,
      completed,
    },
    totalDelta: toDelta(createdThisWeek, createdLastWeek, "new this week"),
    completedDelta: toDelta(
      completedThisWeek,
      completedLastWeek,
      "vs last week",
    ),
    series: {
      daily: bucketDaily(completedDates, 7),
      weekly: bucketWeekly(completedDates, 8),
      monthly: bucketMonthly(completedDates, 6),
    },
    weeklyGoal: {
      target: goalRows[0]?.target ?? 0,
      done: goalRows[0]?.done ?? 0,
    },
    todayTasks: todayRows.map(serializeTask),
    recent: recentRows.map(serializeTask),
  };
}
