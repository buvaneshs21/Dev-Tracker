import Link from "next/link";
import {
  CalendarClock,
  CalendarPlus,
  Clock,
  FolderKanban,
  UserRound,
  UserRoundCog,
  UserRoundPen,
} from "lucide-react";

import Card from "@/components/ui/Card";
import StatusPill from "@/components/common/StatusPill";
import PriorityBadge from "@/components/common/PriorityBadge";
import { colorClassesFor } from "@/components/projects/project-colors";
import AssigneeSelect from "./AssigneeSelect";
import type { TaskDetailData } from "@/lib/types";

function longDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface TaskSidebarProps {
  detail: TaskDetailData;
  /** Omitted when the viewer can't edit — the assignee then renders as text. */
  onAssign?: (userId: string) => Promise<void>;
}

/** The "at a glance" column. Assignment is the one control that lives here. */
export default function TaskSidebar({ detail, onAssign }: TaskSidebarProps) {
  const { task } = detail;

  // Names are resolved from the member list rather than read off the server
  // props. Reassigning updates task.assigneeId immediately, but the names in
  // `detail` only catch up on the next router.refresh() — so trusting those
  // would leave the old person's name on screen until the refetch landed.
  const nameById = new Map(
    detail.assignableMembers.map((member) => [member.userId, member.name]),
  );

  const assigneeName = nameById.get(task.assigneeId) ?? detail.assigneeName;

  const assignedByName = task.assignedById
    ? (nameById.get(task.assignedById) ?? detail.assignedByName)
    : null;

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
            Assigned to
          </dt>
          <dd className="mt-1.5">
            <AssigneeSelect
              value={task.assigneeId}
              members={detail.assignableMembers}
              currentName={assigneeName}
              disabled={!onAssign}
              onAssign={onAssign ?? (async () => {})}
            />
          </dd>
        </div>

        {/* Null until someone actually hands the task over, which is most of
            them — a task nobody reassigned was never "assigned by" anyone. */}
        {assignedByName && (
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <UserRoundCog className="h-3.5 w-3.5" aria-hidden="true" />
              Assigned by
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
              {assignedByName}
              {task.assignedAt && (
                <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                  on {longDate(task.assignedAt)}
                </span>
              )}
            </dd>
          </div>
        )}

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <UserRoundPen className="h-3.5 w-3.5" aria-hidden="true" />
            Created by
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {detail.creatorName}
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
