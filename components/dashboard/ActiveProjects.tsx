import Link from "next/link";
import { ArrowRight, FolderPlus } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import ProjectProgress from "@/components/projects/ProjectProgress";
import { PROJECT_COLOR_CLASSES } from "@/components/projects/project-colors";
import type { ProjectWithStats } from "@/lib/types";

interface ActiveProjectsProps {
  /** Already filtered to active projects and capped by the caller. */
  projects: ProjectWithStats[];
  activeCount: number;
  /** Distinct people sharing a project with the user, excluding themselves. */
  collaboratorCount: number;
}

export default function ActiveProjects({
  projects,
  activeCount,
  collaboratorCount,
}: ActiveProjectsProps) {
  return (
    <Card className="p-6">
      <SectionHeader
        title="Projects"
        subtitle={`${activeCount} active · ${collaboratorCount} collaborator${
          collaboratorCount === 1 ? "" : "s"
        }`}
        action={
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-700 dark:hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No active projects"
          message="Create a project to group related tasks together."
          action={
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
            >
              Create Project
            </Link>
          }
        />
      ) : (
        <ul className="mt-5 space-y-4">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="block rounded-xl p-2.5 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${PROJECT_COLOR_CLASSES[project.color].dot}`}
                    />
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {project.name}
                    </span>
                  </span>

                  <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {project.stats.progress}%
                  </span>
                </div>

                <div className="mt-2.5">
                  <ProjectProgress
                    percent={project.stats.progress}
                    color={project.color}
                    showLabel={false}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
