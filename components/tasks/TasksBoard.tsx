"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  X,
} from "lucide-react";

import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/common/StatusPill";
import PriorityBadge from "@/components/common/PriorityBadge";
import DueDate from "@/components/common/DueDate";
import TaskForm, {
  EMPTY_TASK_FORM,
  type TaskFormValues,
} from "./TaskForm";

import { toDateInputValue } from "@/lib/dates";
import {
  STATUS_LABELS,
  TASK_STATUSES,
  type ProjectDTO,
  type TaskDTO,
  type TaskStatus,
} from "@/lib/types";
import { PROJECT_COLOR_CLASSES } from "@/components/projects/project-colors";

type Filter = "all" | TaskStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in-progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

interface TasksBoardProps {
  initialTasks: TaskDTO[];
  initialCreateOpen: boolean;
  /** Active search term, already applied server-side. */
  search: string;
  /** Offered in the task form's project picker. */
  projects: ProjectDTO[];
}

export default function TasksBoard({
  initialTasks,
  initialCreateOpen,
  search,
  projects,
}: TasksBoardProps) {
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(initialCreateOpen);
  const [createValues, setCreateValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = {
    all: tasks.length,
    pending: tasks.filter((task) => task.status === "pending").length,
    "in-progress": tasks.filter((task) => task.status === "in-progress").length,
    completed: tasks.filter((task) => task.status === "completed").length,
  };

  const visible =
    filter === "all" ? tasks : tasks.filter((task) => task.status === filter);

  const projectById = new Map(projects.map((project) => [project.id, project]));

  /** A 401 means the token expired while the page was open — the proxy only
   *  runs on navigation, so the API is what notices first. */
  const handleUnauthorized = () => {
    router.replace("/login");
    router.refresh();
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createValues.title.trim()) return;

    setSaving(true);
    setError(null);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createValues),
    });

    if (res.status === 401) return handleUnauthorized();

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create the task.");
      setSaving(false);
      return;
    }

    const task: TaskDTO = await res.json();
    setTasks((prev) => [task, ...prev]);
    setCreateValues(EMPTY_TASK_FORM);
    setCreating(false);
    setSaving(false);
    router.refresh(); // keep the dashboard's counts and chart in sync
  };

  const patchTask = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    setError(null);

    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 401) return handleUnauthorized();

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update the task.");
      setBusyId(null);
      return false;
    }

    const updated: TaskDTO = await res.json();
    setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
    setBusyId(null);
    router.refresh();
    return true;
  };

  const deleteTask = async (id: string) => {
    setBusyId(id);
    setError(null);

    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });

    if (res.status === 401) return handleUnauthorized();

    if (!res.ok) {
      setError("Could not delete the task.");
      setBusyId(null);
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== id));
    setConfirmingId(null);
    setBusyId(null);
    router.refresh();
  };

  const startEditing = (task: TaskDTO) => {
    setEditingId(task.id);
    setEditValues({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      projectId: task.projectId ?? "",
      startDate: toDateInputValue(task.startDate),
      dueDate: toDateInputValue(task.dueDate),
    });
    setConfirmingId(null);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId || !editValues.title.trim()) return;

    setSaving(true);
    const ok = await patchTask(editingId, editValues);
    setSaving(false);
    if (ok) setEditingId(null);
  };

  const open = counts.pending + counts["in-progress"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Tasks
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {counts.all === 0
              ? "Nothing here yet — create your first task."
              : `${open} open · ${counts.completed} completed`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreating((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0"
        >
          {creating ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {creating ? "Cancel" : "New Task"}
        </button>
      </div>

      {search && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900 dark:text-indigo-200">
          <span>
            Showing results for <strong>“{search}”</strong>
          </span>
          <Link
            href="/tasks"
            className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors hover:bg-indigo-100"
          >
            Clear search
          </Link>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {creating && (
        <Card className="fade-up p-6">
          <TaskForm
            values={createValues}
            onChange={setCreateValues}
            onSubmit={createTask}
            onCancel={() => setCreating(false)}
            submitLabel="Add task"
            pendingLabel="Adding…"
            saving={saving}
            projects={projects}
          />
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
              filter === item.key
                ? "bg-slate-900 dark:bg-slate-700 text-white shadow-sm"
                : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {item.label}
            <span
              className={
                filter === item.key ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"
              }
            >
              {counts[item.key]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed">
          {search && counts.all === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matches"
              message={`Nothing matched “${search}”. Try a different term.`}
              action={
                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Clear search
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={ListTodo}
              title={counts.all === 0 ? "No tasks yet" : "Nothing in this view"}
              message={
                counts.all === 0
                  ? "Create your first task and it will show up here."
                  : "Try a different filter to see your other tasks."
              }
              action={
                counts.all === 0 && !creating ? (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Task
                  </button>
                ) : undefined
              }
            />
          )}
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((task) => {
            const busy = busyId === task.id;
            const done = task.status === "completed";

            if (editingId === task.id) {
              return (
                <li key={task.id}>
                  <Card className="p-5 ring-2 ring-indigo-500/10">
                    <TaskForm
                      compact
                      values={editValues}
                      onChange={setEditValues}
                      onSubmit={saveEdit}
                      onCancel={() => setEditingId(null)}
                      submitLabel="Save changes"
                      pendingLabel="Saving…"
                      saving={saving}
                      projects={projects}
                    />
                  </Card>
                </li>
              );
            }

            return (
              <li key={task.id}>
                <Card interactive className="flex items-start gap-4 p-5">
                  <button
                    type="button"
                    onClick={() =>
                      patchTask(task.id, {
                        status: done ? "pending" : "completed",
                      })
                    }
                    disabled={busy}
                    aria-label={
                      done
                        ? `Reopen "${task.title}"`
                        : `Mark "${task.title}" complete`
                    }
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                      done
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-slate-300 dark:border-slate-700 text-transparent hover:border-green-500 hover:text-green-500"
                    } disabled:opacity-60`}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 dark:text-slate-500" />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    {/* The title opens the task's detail page — where notes,
                        attachments, subtasks and links live. */}
                    <Link
                      href={`/tasks/${task.id}`}
                      className={`rounded text-sm font-medium transition-colors hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:hover:text-indigo-400 ${
                        done
                          ? "text-slate-400 line-through dark:text-slate-500"
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {task.title}
                    </Link>

                    {task.description && (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      <StatusPill status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      <DueDate value={task.dueDate} muted={done} />

                      {(() => {
                        // Tasks with no project simply show no chip — that's
                        // the normal state for anything created before
                        // projects existed.
                        const project = task.projectId
                          ? projectById.get(task.projectId)
                          : undefined;
                        if (!project) return null;

                        return (
                          <Link
                            href={`/projects/${project.id}`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                          >
                            <span
                              aria-hidden="true"
                              className={`h-2 w-2 rounded-full ${PROJECT_COLOR_CLASSES[project.color].dot}`}
                            />
                            {project.name}
                          </Link>
                        );
                      })()}

                      <select
                        value={task.status}
                        onChange={(event) =>
                          patchTask(task.id, { status: event.target.value })
                        }
                        disabled={busy}
                        aria-label={`Change status of "${task.title}"`}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {TASK_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {confirmingId === task.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          disabled={busy}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-red-700 disabled:opacity-60"
                        >
                          {busy ? "Deleting…" : "Delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(task)}
                          aria-label={`Edit "${task.title}"`}
                          className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(task.id)}
                          aria-label={`Delete "${task.title}"`}
                          className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
