import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  ListTodo,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import ProjectProgress from "./ProjectProgress";
import type { ProjectWithStats } from "@/lib/types";

function longDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Tile = { label: string; value: number; icon: LucideIcon; className: string };

export default function ProjectStats({
  project,
}: {
  project: ProjectWithStats;
}) {
  const { stats } = project;

  const tiles: Tile[] = [
    {
      label: "Total tasks",
      value: stats.total,
      icon: ListTodo,
      className: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock3,
      className: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    {
      label: "In progress",
      value: stats.inProgress,
      icon: LoaderCircle,
      className: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      className: "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <SectionHeader
          title="Progress"
          subtitle={
            stats.total === 0
              ? "No tasks yet — progress starts at 0%"
              : `${stats.completed} of ${stats.total} tasks completed`
          }
        />

        <div className="mt-5 flex items-center gap-5">
          <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {stats.progress}%
          </span>
          <div className="flex-1">
            <ProjectProgress
              percent={stats.progress}
              color={project.color}
              showLabel={false}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;

          return (
            <Card key={tile.label} interactive className="p-5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile.className}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {tile.value}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tile.label}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <SectionHeader title="Timeline" />

        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Start date</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                {longDate(project.startDate)}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Due date</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                {longDate(project.dueDate)}
              </dd>
            </div>
          </div>
        </dl>
      </Card>
    </div>
  );
}
