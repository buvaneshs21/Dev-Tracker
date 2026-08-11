"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FolderPlus, Plus, Search, SearchX } from "lucide-react";

import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ProjectCard from "./ProjectCard";
import ProjectFormDialog from "./ProjectFormDialog";
import DeleteProjectDialog from "./DeleteProjectDialog";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectDTO,
  type ProjectStatus,
  type ProjectWithStats,
} from "@/lib/types";

type Filter = "all" | ProjectStatus;

const FILTERS: Filter[] = ["all", ...PROJECT_STATUSES];

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  ...PROJECT_STATUS_LABELS,
};

export default function ProjectsBoard({
  initialProjects,
}: {
  initialProjects: ProjectWithStats[];
}) {
  const router = useRouter();

  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectWithStats | null>(null);
  const [deleting, setDeleting] = useState<ProjectWithStats | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      completed: projects.filter((p) => p.status === "completed").length,
      archived: projects.filter((p) => p.status === "archived").length,
    }),
    [projects],
  );

  // Filtering runs in memory: the list is small and this keeps typing instant.
  // The API also accepts ?q= and ?status= for non-UI callers.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return projects.filter((project) => {
      if (filter !== "all" && project.status !== filter) return false;
      if (!term) return true;

      return (
        project.name.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term)
      );
    });
  }, [projects, search, filter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (project: ProjectWithStats) => {
    setEditing(project);
    setFormOpen(true);
  };

  const handleSaved = (saved: ProjectDTO) => {
    setProjects((prev) => {
      const existing = prev.find((project) => project.id === saved.id);

      if (existing) {
        // Editing a project changes none of its derived fields.
        return prev.map((project) =>
          project.id === saved.id
            ? {
                ...saved,
                stats: existing.stats,
                memberCount: existing.memberCount,
                role: existing.role,
              }
            : project,
        );
      }

      // A brand-new project has no tasks yet, and its creator is its only
      // member — and its owner.
      return [
        {
          ...saved,
          stats: {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            progress: 0,
          },
          memberCount: 1,
          role: "owner" as const,
        },
        ...prev,
      ];
    });

    setNotice(
      editing ? "Project updated." : `“${saved.name}” created.`,
    );
    router.refresh(); // keeps the dashboard's project count in step
  };

  const handleDeleted = (projectId: string, detachedTasks: number) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setNotice(
      detachedTasks > 0
        ? `Project deleted. ${detachedTasks} task${
            detachedTasks === 1 ? "" : "s"
          } moved to “No project”.`
        : "Project deleted.",
    );
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Projects
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Manage your projects and track progress.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Project
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/15 px-4 py-3 text-sm text-green-800 dark:text-green-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-300 transition-colors hover:bg-green-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {projects.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 sm:max-w-xs">
            <Search
              className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              aria-label="Search projects"
              className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  filter === key
                    ? "bg-slate-900 dark:bg-slate-700 text-white shadow-sm"
                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {FILTER_LABELS[key]}
                <span
                  className={
                    filter === key ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"
                  }
                >
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <Card className="border-dashed">
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderPlus}
              title="No projects yet"
              message="Create your first project and start organizing your work."
              action={
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create Project
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="No matching projects"
              message="Try a different search term or filter."
            />
          )}
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <ProjectFormDialog
          project={editing}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <DeleteProjectDialog
          project={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
