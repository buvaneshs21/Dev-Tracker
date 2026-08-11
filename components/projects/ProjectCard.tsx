import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { roleCan } from "@/lib/roles";

import Card from "@/components/ui/Card";
import Dropdown from "@/components/ui/Dropdown";
import ProjectProgress from "./ProjectProgress";
import { PROJECT_COLOR_CLASSES, PROJECT_STATUS_CLASSES } from "./project-colors";
import { relativeTime } from "@/lib/format";
import { PROJECT_STATUS_LABELS, type ProjectWithStats } from "@/lib/types";

interface ProjectCardProps {
  project: ProjectWithStats;
  onEdit: (project: ProjectWithStats) => void;
  onDelete: (project: ProjectWithStats) => void;
}

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const colors = PROJECT_COLOR_CLASSES[project.color];
  const start = shortDate(project.startDate);
  const due = shortDate(project.dueDate);

  // UX gating only — both actions are re-authorised on the server.
  const canEdit = roleCan(project.role, "project:edit");
  const canDelete = roleCan(project.role, "project:delete");

  return (
    <Card interactive className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-1 h-3 w-3 shrink-0 rounded-full ${colors.dot}`}
          />

          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
              {project.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {project.description || "No description"}
            </p>
          </div>
        </div>

        <Dropdown
          label={`Actions for ${project.name}`}
          triggerClassName="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          panelClassName="w-44 p-1.5"
          trigger={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
        >
          <Link
            href={`/projects/${project.id}`}
            role="menuitem"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            Open
          </Link>

          {canEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => onEdit(project)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => onDelete(project)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          )}
        </Dropdown>
      </div>

      <div className="mt-4">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PROJECT_STATUS_CLASSES[project.status]}`}
        >
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
      </div>

      <div className="mt-5">
        <ProjectProgress percent={project.stats.progress} color={project.color} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5" aria-hidden="true" />
          {project.stats.total} task{project.stats.total === 1 ? "" : "s"}
        </span>

        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {project.memberCount} member{project.memberCount === 1 ? "" : "s"}
        </span>

        {start && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            From {start}
          </span>
        )}

        {due && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            Due {due}
          </span>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Updated {relativeTime(project.updatedAt)}
        </span>

        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Open Project
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
