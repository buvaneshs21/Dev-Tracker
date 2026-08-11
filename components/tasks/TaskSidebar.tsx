import Link from "next/link";
import {
  CalendarClock,
  CalendarPlus,
  Clock,
  FolderKanban,
  UserRound,
} from "lucide-react";

import Card from "@/components/ui/Card";
import StatusPill from "@/components/common/StatusPill";
import PriorityBadge from "@/components/common/PriorityBadge";
import { colorClassesFor } from "@/components/projects/project-colors";
import type { TaskDetailData } from "@/lib/types";

function longDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The "at a glance" column: metadata only, no controls. */
export default function TaskSidebar({ detail }: { detail: TaskDetailData }) {
  const { task } = detail;

  const overdue =
    task.status !== "completed" &&
    Boolean(task.dueDate) &&
    new Date(task.dueDate!) < new Date();

  return (
    <Card className="p-6">
      <dl className="space-y-5 text-sm">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Status</dt>
          <dd className="mt-1.5">
            <StatusPill status={task.status} />
          </dd>
        </div>

        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">
            Priority
          </dt>
          <dd className="mt-1.5">
            <PriorityBadge priority={task.priority} />
          </dd>
        </div>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
            Project
          </dt>
          <dd className="mt-1.5">
            {/* Only rendered when the viewer can reach the project — the
                loader resolves it through the same access check. */}
            {detail.projectName && task.projectId ? (
              <Link
                href={`/projects/${task.projectId}`}
                className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-slate-900 transition-colors hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${colorClassesFor(detail.projectColor).dot}`}
                />
                {detail.projectName}
              </Link>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">
                No project
              </span>
            )}
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            Assignee
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {detail.assigneeName}
          </dd>
        </div>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Start date
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {longDate(task.startDate)}
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            Due date
          </dt>
          <dd
            className={`mt-1.5 text-sm font-medium ${
              overdue
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {longDate(task.dueDate)}
          </dd>
        </div>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Time logged
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {detail.totalHours > 0 ? `${detail.totalHours} hours` : "None yet"}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Created</dt>
          <dd className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            {longDate(task.createdAt)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
