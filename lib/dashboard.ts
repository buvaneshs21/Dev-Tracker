import mongoose from "mongoose";

import Task from "@/models/Task";
import { getOverdueTasks, getUpcomingTasks } from "./calendar";
import { myTasksFilter } from "./tasks";
import type { TaskStatus, UpcomingTask } from "./types";

/**
 * The slice of the dashboard that changes when a task changes.
 *
 * Deliberately narrower than `getDashboardData`: the productivity chart, the
 * weekly goal and the recent-activity list are all rendered once on the server
 * and left alone. This is the part a task event can invalidate, and it costs
 * three queries rather than seven — worth separating, because it runs again on
 * every event.
 */
export type DashboardSummary = {
  counts: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  upcoming: UpcomingTask[];
  overdue: UpcomingTask[];
};

type StatusCountRow = { _id: TaskStatus; count: number };

/**
 * Recomputed from the database rather than patched from event deltas.
 *
 * Counters derived from deltas drift: a status change is two adjustments, a
 * project move changes what is in scope, a reassignment moves a task between
 * two people's totals, and any missed or duplicated event leaves the numbers
 * permanently wrong with nothing to correct them. Re-deriving is idempotent by
 * construction — the event is only a signal that something changed, and the
 * database stays the single source of truth.
 *
 * It is also the only way the counts can honour authorisation: `myTasksFilter`
 * runs here, on the server, against the session user.
 */
export async function getDashboardSummary(
  userId: string,
): Promise<DashboardSummary> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      counts: { total: 0, pending: 0, inProgress: 0, completed: 0 },
      upcoming: [],
      overdue: [],
    };
  }

  const mine = await myTasksFilter(userId);

  const [statusRows, upcoming, overdue] = await Promise.all([
    Task.aggregate<StatusCountRow>([
      { $match: mine },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    getUpcomingTasks(userId, 4),
    getOverdueTasks(userId, 3),
  ]);

  const byStatus = (status: TaskStatus) =>
    statusRows.find((row) => row._id === status)?.count ?? 0;

  const pending = byStatus("pending");
  const inProgress = byStatus("in-progress");
  const completed = byStatus("completed");

  return {
    counts: {
      total: pending + inProgress + completed,
      pending,
      inProgress,
      completed,
    },
    upcoming,
    overdue,
  };
}
