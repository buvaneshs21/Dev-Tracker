import mongoose from "mongoose";

import Task from "@/models/Task";
import Project from "@/models/Project";
import { myTasksFilter } from "./tasks";
import { getAccessibleProjectIds } from "./permissions";
import {
  addDays,
  addMonths,
  dayKey,
  endOfDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "./dates";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type AnalyticsData,
  type AnalyticsOverview,
  type AnalyticsRange,
  type OverdueStats,
  type PrioritySlice,
  type ProductivityInsight,
  type ProductivityPoint,
  type ProjectColor,
  type ProjectPerformanceRow,
  type TaskStatusSlice,
} from "./types";

/**
 * The window a range selects.
 *
 * `start` is null for "all time" — the aggregation then skips the date filter
 * entirely rather than inventing a boundary. `previousStart/End` is the
 * equally-long window immediately before, used only for the trend insight.
 */
type Window = {
  start: Date | null;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
  /** The chart always needs a concrete start, even for "all time". */
  chartStart: Date;
  granularity: "day" | "week" | "month";
};

function resolveWindow(range: AnalyticsRange): Window {
  const now = new Date();
  const end = endOfDay(now);

  const spanWindow = (days: number): Window => {
    const start = startOfDay(addDays(now, -(days - 1)));
    return {
      start,
      end,
      previousStart: startOfDay(addDays(start, -days)),
      previousEnd: new Date(start.getTime() - 1),
      chartStart: start,
      granularity: days <= 31 ? "day" : days <= 120 ? "week" : "month",
    };
  };

  switch (range) {
    case "7d":
      return spanWindow(7);
    case "30d":
      return spanWindow(30);
    case "3m":
      return spanWindow(90);
    case "month": {
      const start = startOfMonth(now);
      const previousStart = addMonths(start, -1);
      return {
        start,
        end,
        previousStart,
        previousEnd: new Date(start.getTime() - 1),
        chartStart: start,
        granularity: "day",
      };
    }
    case "all":
    default:
      return {
        start: null,
        end,
        // No comparable "previous all time", so the trend insight is skipped.
        previousStart: null,
        previousEnd: null,
        chartStart: startOfMonth(addMonths(now, -11)),
        granularity: "month",
      };
  }
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

// ---------------------------------------------------------------------------
// Aggregations. Every $match starts with the authenticated user's id.
// ---------------------------------------------------------------------------

type CompositionRow = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  high: number;
  medium: number;
  low: number;
};

/**
 * Status counts and priority counts in a single pass — they share the same
 * cohort (tasks created in the window), so splitting them would mean scanning
 * the collection twice for the same documents.
 */
async function getComposition(
  mine: Record<string, unknown>,
  window: Window,
): Promise<CompositionRow> {
  const match: Record<string, unknown> = { ...mine };
  if (window.start) {
    match.createdAt = { $gte: window.start, $lte: window.end };
  }

  const countIf = (field: string, value: string) => ({
    $sum: { $cond: [{ $eq: [`$${field}`, value] }, 1, 0] },
  });

  const [row] = await Task.aggregate<CompositionRow>([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: countIf("status", "pending"),
        inProgress: countIf("status", "in-progress"),
        completed: countIf("status", "completed"),
        high: countIf("priority", "high"),
        medium: countIf("priority", "medium"),
        low: countIf("priority", "low"),
      },
    },
  ]);

  return (
    row ?? {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
  );
}

/** Buckets completion timestamps into the grid the chart draws. */
function bucketCompletions(
  dates: Date[],
  window: Window,
): ProductivityPoint[] {
  const points: ProductivityPoint[] = [];
  const counts = new Map<string, number>();

  const push = (date: Date, label: string) => {
    const key = dayKey(date);
    counts.set(key, 0);
    points.push({ key, label, count: 0 });
  };

  if (window.granularity === "day") {
    for (
      let cursor = startOfDay(window.chartStart);
      cursor <= window.end;
      cursor = addDays(cursor, 1)
    ) {
      push(
        cursor,
        cursor.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      );
    }
  } else if (window.granularity === "week") {
    for (
      let cursor = startOfWeek(window.chartStart);
      cursor <= window.end;
      cursor = addDays(cursor, 7)
    ) {
      push(
        cursor,
        cursor.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      );
    }
  } else {
    for (
      let cursor = startOfMonth(window.chartStart);
      cursor <= window.end;
      cursor = addMonths(cursor, 1)
    ) {
      push(cursor, cursor.toLocaleDateString("en-US", { month: "short" }));
    }
  }

  const bucketOf = (date: Date) =>
    window.granularity === "day"
      ? dayKey(startOfDay(date))
      : window.granularity === "week"
        ? dayKey(startOfWeek(date))
        : dayKey(startOfMonth(date));

  for (const date of dates) {
    const key = bucketOf(date);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return points.map((point) => ({
    ...point,
    count: counts.get(point.key) ?? 0,
  }));
}

type ProjectStatsRow = {
  _id: mongoose.Types.ObjectId | null;
  total: number;
  completed: number;
};

type OverdueRow = { completedWithDueDate: number; onTime: number };

// ---------------------------------------------------------------------------

function buildInsights({
  overview,
  overdue,
  projects,
  completedInRange,
  completedPreviously,
  hasPrevious,
}: {
  overview: AnalyticsOverview;
  overdue: OverdueStats;
  projects: ProjectPerformanceRow[];
  completedInRange: number;
  completedPreviously: number;
  hasPrevious: boolean;
}): ProductivityInsight[] {
  const insights: ProductivityInsight[] = [];

  // Only claim a trend when there is a real baseline to compare against.
  if (hasPrevious && completedPreviously > 0) {
    const change = Math.round(
      ((completedInRange - completedPreviously) / completedPreviously) * 100,
    );

    if (change !== 0) {
      insights.push({
        id: "trend",
        tone: change > 0 ? "positive" : "warning",
        icon: change > 0 ? "🔥" : "📉",
        message:
          change > 0
            ? `You completed ${change}% more tasks than the previous period.`
            : `You completed ${Math.abs(change)}% fewer tasks than the previous period.`,
      });
    }
  } else if (hasPrevious && completedPreviously === 0 && completedInRange > 0) {
    insights.push({
      id: "trend",
      tone: "positive",
      icon: "🔥",
      message: `You completed ${completedInRange} task${
        completedInRange === 1 ? "" : "s"
      } this period, up from none previously.`,
    });
  }

  if (overdue.overdue > 0) {
    insights.push({
      id: "overdue",
      tone: "warning",
      icon: "⚠️",
      message: `You currently have ${overdue.overdue} overdue task${
        overdue.overdue === 1 ? "" : "s"
      }.`,
    });
  }

  if (overview.total > 0) {
    insights.push({
      id: "rate",
      tone: overview.completionRate >= 60 ? "positive" : "neutral",
      icon: "🎯",
      message: `Your completion rate is ${overview.completionRate}%.`,
    });
  }

  const busiest = projects
    .filter((project) => project.total > 0)
    .sort((a, b) => b.total - a.total)[0];

  if (busiest) {
    insights.push({
      id: "busiest",
      tone: "neutral",
      icon: "📁",
      message: `${busiest.name} contains the most tasks (${busiest.total}).`,
    });
  }

  if (overdue.onTimeRate !== null && overdue.completedWithDueDate >= 3) {
    insights.push({
      id: "ontime",
      tone: overdue.onTimeRate >= 70 ? "positive" : "neutral",
      icon: "⏱️",
      message: `${overdue.onTimeRate}% of your completed tasks finished on time.`,
    });
  }

  return insights;
}

/**
 * Everything the analytics page renders, for one user.
 *
 * Composition metrics (totals, status, priority, project rows) cover tasks
 * *created* in the window; the productivity chart counts tasks *completed* in
 * it. Overdue is deliberately current-state rather than window-scoped. The UI
 * labels each so the numbers can't be misread.
 */
export async function getAnalytics(
  userId: string,
  range: AnalyticsRange,
): Promise<AnalyticsData> {
  const window = resolveWindow(range);

  // Analytics asks the same "is this mine?" question as the dashboard, so it
  // uses the same answer. It previously matched the creator, which meant work
  // assigned to you inside someone else's project was missing from your own
  // statistics while appearing in your task list.
  const mine = await myTasksFilter(userId);
  const accessible = await getAccessibleProjectIds(userId);

  const projectMatch: Record<string, unknown> = { ...mine };
  if (window.start) {
    projectMatch.createdAt = { $gte: window.start, $lte: window.end };
  }

  const [
    composition,
    completions,
    completedPreviously,
    projectRows,
    projects,
    overdueCount,
    overdueRows,
    anyTaskCount,
  ] = await Promise.all([
    getComposition(mine, window),

    Task.find({
      ...mine,
      completedAt: { $gte: window.chartStart, $lte: window.end },
    })
      .select("completedAt")
      .lean<{ completedAt: Date }[]>(),

    window.previousStart && window.previousEnd
      ? Task.countDocuments({
          ...mine,
          completedAt: { $gte: window.previousStart, $lte: window.previousEnd },
        })
      : Promise.resolve(0),

    Task.aggregate<ProjectStatsRow>([
      { $match: projectMatch },
      {
        $group: {
          _id: "$projectId",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]),

    // Fetched in full so projects with no tasks still appear at 0%. Scoped to
    // every project the user can reach, matching the task scope above — owned
    // projects alone would leave a joined project's rows unnamed.
    Project.find({ _id: { $in: accessible } })
      .select("name color")
      .lean<{ _id: unknown; name?: string; color?: ProjectColor }[]>(),

    Task.countDocuments({
      ...mine,
      status: { $ne: "completed" },
      dueDate: { $ne: null, $lt: new Date() },
    }),

    Task.aggregate<OverdueRow>([
      {
        $match: {
          ...mine,
          status: "completed",
          dueDate: { $ne: null },
          completedAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          completedWithDueDate: { $sum: 1 },
          onTime: {
            $sum: { $cond: [{ $lte: ["$completedAt", "$dueDate"] }, 1, 0] },
          },
        },
      },
    ]),

    Task.countDocuments(mine),
  ]);

  const overview: AnalyticsOverview = {
    total: composition.total,
    pending: composition.pending,
    inProgress: composition.inProgress,
    completed: composition.completed,
    completionRate: percent(composition.completed, composition.total),
  };

  const statuses: TaskStatusSlice[] = TASK_STATUSES.map((status) => {
    const count =
      status === "pending"
        ? composition.pending
        : status === "in-progress"
          ? composition.inProgress
          : composition.completed;

    return { status, count, percent: percent(count, composition.total) };
  });

  const priorities: PrioritySlice[] = TASK_PRIORITIES.map((priority) => {
    const count =
      priority === "high"
        ? composition.high
        : priority === "medium"
          ? composition.medium
          : composition.low;

    return { priority, count, percent: percent(count, composition.total) };
  });

  const statsByProject = new Map(
    projectRows
      .filter((row) => row._id)
      .map((row) => [String(row._id), row] as const),
  );

  const projectPerformance: ProjectPerformanceRow[] = projects
    .map((project) => {
      const id = String(project._id);
      const stats = statsByProject.get(id);
      const total = stats?.total ?? 0;
      const completed = stats?.completed ?? 0;

      return {
        id,
        name: project.name ?? "Untitled",
        color: project.color ?? "indigo",
        total,
        completed,
        progress: percent(completed, total),
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const overdueRow = overdueRows[0];
  const overdueStats: OverdueStats = {
    overdue: overdueCount,
    completedWithDueDate: overdueRow?.completedWithDueDate ?? 0,
    onTime: overdueRow?.onTime ?? 0,
    onTimeRate: overdueRow?.completedWithDueDate
      ? percent(overdueRow.onTime, overdueRow.completedWithDueDate)
      : null,
  };

  const completionDates = completions.map((row) => new Date(row.completedAt));
  const productivity = bucketCompletions(completionDates, window);

  const completedInRange = window.start
    ? completionDates.filter((date) => date >= window.start!).length
    : completionDates.length;

  return {
    range,
    granularity: window.granularity,
    overview,
    productivity,
    statuses,
    priorities,
    projects: projectPerformance,
    overdueStats,
    insights: buildInsights({
      overview,
      overdue: overdueStats,
      projects: projectPerformance,
      completedInRange,
      completedPreviously,
      hasPrevious: window.previousStart !== null,
    }),
    hasAnyTasks: anyTaskCount > 0,
  };
}

/** Compact figures for the dashboard widget — one aggregation, no charts. */
export async function getAnalyticsSummary(userId: string): Promise<{
  total: number;
  completed: number;
  completionRate: number;
}> {
  const composition = await getComposition(
    await myTasksFilter(userId),
    resolveWindow("all"),
  );

  return {
    total: composition.total,
    completed: composition.completed,
    completionRate: percent(composition.completed, composition.total),
  };
}
