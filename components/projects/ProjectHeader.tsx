import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import ProjectProgress from "./ProjectProgress";
import { PROJECT_COLOR_CLASSES, PROJECT_STATUS_CLASSES } from "./project-colors";
import { PROJECT_STATUS_LABELS, type ProjectWithStats } from "@/lib/types";

interface ProjectHeaderProps {
  project: ProjectWithStats;
  /** UX only — the server re-checks both before acting. */
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProjectHeader({
  project,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ProjectHeaderProps) {
  const colors = PROJECT_COLOR_CLASSES[project.color];

  return (
    <header className="space-y-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            aria-hidden="true"
            className={`mt-2.5 h-4 w-4 shrink-0 rounded-full ${colors.dot}`}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                {project.name}
              </h2>

              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PROJECT_STATUS_CLASSES[project.status]}`}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>

            {project.description && (
              <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md">
        <ProjectProgress percent={project.stats.progress} color={project.color} />
      </div>
    </header>
  );
}
