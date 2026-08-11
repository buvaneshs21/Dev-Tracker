import Link from "next/link";
import { FolderKanban } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import { PROJECT_COLOR_CLASSES } from "@/components/projects/project-colors";
import type { ProjectPerformanceRow } from "@/lib/types";

export default function ProjectPerformance({
  projects,
}: {
  projects: ProjectPerformanceRow[];
}) {
  return (
    <Card className="p-6">
      <SectionHeader
        title="Project performance"
        subtitle="Tasks created in this period, by project"
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          message="Create a project to group tasks and track its progress."
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
        // Scrolls inside its own container so the page never overflows sideways.
        <div className="mt-5 -mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
                <th scope="col" className="py-2.5 pr-4 font-medium text-slate-500 dark:text-slate-400">
                  Project
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400"
                >
                  Tasks
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400"
                >
                  Completed
                </th>
                <th
                  scope="col"
                  className="w-[38%] py-2.5 pl-4 font-medium text-slate-500 dark:text-slate-400"
                >
                  Progress
                </th>
              </tr>
            </thead>

            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <th scope="row" className="py-3.5 pr-4 font-normal">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-2.5 rounded-lg font-medium text-slate-900 dark:text-slate-100 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    >
                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${PROJECT_COLOR_CLASSES[project.color].dot}`}
                      />
                      {project.name}
                    </Link>
                  </th>

                  <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                    {project.total}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                    {project.completed}
                  </td>

                  <td className="py-3.5 pl-4">
                    <div className="flex items-center gap-3">
                      <div
                        role="progressbar"
                        aria-valuenow={project.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${project.name}: ${project.progress}% complete`}
                        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${PROJECT_COLOR_CLASSES[project.color].bar}`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>

                      <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                        {project.progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
