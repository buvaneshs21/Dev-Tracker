import { CheckCircle2, History, PencilLine, PlusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import { relativeTime } from "@/lib/format";
import type { TaskDTO } from "@/lib/types";

type Activity = { label: string; Icon: LucideIcon; className: string };

/**
 * Derives what happened from the task's own timestamps. Only task events exist
 * — there is no projects or members backend to draw those from.
 */
function describe(task: TaskDTO): Activity {
  if (task.status === "completed" && task.completedAt) {
    return {
      label: "Task completed",
      Icon: CheckCircle2,
      className: "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400",
    };
  }

  if (task.createdAt === task.updatedAt) {
    return {
      label: "Task created",
      Icon: PlusCircle,
      className: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    };
  }

  return {
    label: "Task updated",
    Icon: PencilLine,
    className: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
  };
}

export default function RecentActivity({ tasks }: { tasks: TaskDTO[] }) {
  return (
    <Card className="p-6">
      <SectionHeader title="Recent activity" subtitle="Latest first" />

      {tasks.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nothing here yet"
          message="Create or complete a task and it'll show up in this feed."
        />
      ) : (
        <ol className="mt-5 space-y-4">
          {tasks.map((task) => {
            const { label, Icon, className } = describe(task);

            return (
              <li key={task.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${className}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
                  <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {relativeTime(task.updatedAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
