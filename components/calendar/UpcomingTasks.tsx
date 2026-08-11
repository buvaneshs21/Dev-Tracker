import Link from "next/link";
import { AlertTriangle, ArrowRight, PartyPopper } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/common/StatusPill";
import PriorityBadge from "@/components/common/PriorityBadge";
import { colorClassesFor } from "@/components/projects/project-colors";
import { relativeDayLabel } from "@/lib/dates";
import type { UpcomingTask } from "@/lib/types";

interface UpcomingTasksProps {
  tasks: UpcomingTask[];
  /** Rendered above the upcoming list, flagged in the danger colour. */
  overdue?: UpcomingTask[];
  /** Adds a "View calendar" link — used on the dashboard. */
  showCalendarLink?: boolean;
}

function TaskRow({ task, overdue }: { task: UpcomingTask; overdue: boolean }) {
  return (
    <li>
      <Link
        href={`/tasks/${task.id}`}
        className="flex items-start gap-3 rounded-xl p-2.5 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
            overdue ? "bg-red-500" : colorClassesFor(task.projectColor).dot
          }`}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {task.title}
            </span>
            <span
              className={`shrink-0 text-xs font-medium ${
                overdue ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {task.dueDate ? relativeDayLabel(task.dueDate) : ""}
            </span>
          </span>

          <span className="mt-2 flex flex-wrap items-center gap-2">
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-500/30 ring-inset">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Overdue
              </span>
            )}
            <PriorityBadge priority={task.priority} />
            <StatusPill status={task.status} />
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              {task.projectName ?? "No project"}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function UpcomingTasks({
  tasks,
  overdue = [],
  showCalendarLink = false,
}: UpcomingTasksProps) {
  const empty = tasks.length === 0 && overdue.length === 0;

  return (
    <Card className="p-6">
      <SectionHeader
        title="Upcoming"
        subtitle="Your next deadlines"
        action={
          showCalendarLink ? (
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-700 dark:hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              View calendar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : undefined
        }
      />

      {empty ? (
        <EmptyState
          icon={PartyPopper}
          title="You're all caught up 🎉"
          message="No upcoming tasks. Give a task a due date to see it here."
          action={
            <Link
              href="/tasks?new=1"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
            >
              Create Task
            </Link>
          }
        />
      ) : (
        <div className="mt-4 space-y-4">
          {overdue.length > 0 && (
            <div>
              <p className="px-2.5 text-xs font-semibold tracking-wide text-red-600 dark:text-red-400 uppercase">
                Overdue
              </p>
              <ul className="mt-1.5 space-y-1">
                {overdue.map((task) => (
                  <TaskRow key={task.id} task={task} overdue />
                ))}
              </ul>
            </div>
          )}

          {tasks.length > 0 && (
            <div>
              {overdue.length > 0 && (
                <p className="px-2.5 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
                  Next up
                </p>
              )}
              <ul className="mt-1.5 space-y-1">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} overdue={false} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
