"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Link2, ListTodo, Loader2, Plus, X } from "lucide-react";

import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/common/StatusPill";
import PriorityBadge from "@/components/common/PriorityBadge";
import DueDate from "@/components/common/DueDate";
import TaskForm, {
  EMPTY_TASK_FORM,
  type TaskFormValues,
} from "@/components/tasks/TaskForm";
import type { TaskDTO } from "@/lib/types";

interface ProjectTasksProps {
  projectId: string;
  initialTasks: TaskDTO[];
  /** The user's tasks that aren't in any project — candidates to pull in. */
  unassignedTasks: TaskDTO[];
  /** Viewers can read the task list but not change it. */
  readOnly?: boolean;
}

export default function ProjectTasks({
  projectId,
  initialTasks,
  unassignedTasks,
  readOnly = false,
}: ProjectTasksProps) {
  const router = useRouter();

  const [tasks, setTasks] = useState(initialTasks);
  const [available, setAvailable] = useState(unassignedTasks);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = () => {
    router.replace("/login");
    router.refresh();
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.title.trim() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // projectId comes from the page, not the form — creating here always
        // files the task into this project.
        body: JSON.stringify({ ...values, projectId }),
      });

      if (res.status === 401) return handleUnauthorized();

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not create the task.");
        return;
      }

      const task: TaskDTO = await res.json();
      setTasks((prev) => [task, ...prev]);
      setValues(EMPTY_TASK_FORM);
      setCreating(false);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const patchTask = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not update the task.");
        return null;
      }

      const updated: TaskDTO = await res.json();
      router.refresh();
      return updated;
    } catch {
      setError("Network error. Check your connection and try again.");
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (task: TaskDTO) => {
    const updated = await patchTask(task.id, {
      status: task.status === "completed" ? "pending" : "completed",
    });
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
  };

  const assignExisting = async () => {
    if (!selectedId || saving) return;

    setSaving(true);
    const updated = await patchTask(selectedId, { projectId });
    setSaving(false);

    if (updated) {
      setTasks((prev) => [updated, ...prev]);
      setAvailable((prev) => prev.filter((task) => task.id !== selectedId));
      setSelectedId("");
      setAssigning(false);
    }
  };

  const remove = async (task: TaskDTO) => {
    const updated = await patchTask(task.id, { projectId: null });
    if (updated) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setAvailable((prev) => [updated, ...prev]);
    }
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="Tasks"
        subtitle={`${tasks.length} in this project`}
        action={
          readOnly ? undefined : (
          <div className="flex flex-wrap items-center gap-2">
            {available.length > 0 && (
              <button
                type="button"
                onClick={() => setAssigning(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Assign existing
              </button>
            )}

            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Task
            </button>
          </div>
          )
        }
      />

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks in this project"
          message={
            readOnly
              ? "Nothing has been added to this project yet."
              : "Create a task to start tracking progress."
          }
          action={
            readOnly ? undefined : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Task
              </button>
            )
          }
        />
      ) : (
        <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {tasks.map((task) => {
            const busy = busyId === task.id;
            const done = task.status === "completed";

            return (
              <li key={task.id} className="flex items-start gap-3.5 py-4">
                <button
                  type="button"
                  onClick={() => toggle(task)}
                  disabled={busy || readOnly}
                  aria-label={
                    done
                      ? `Reopen "${task.title}"`
                      : `Mark "${task.title}" complete`
                  }
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    done
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-300 dark:border-slate-700 text-transparent hover:border-green-500 hover:text-green-500"
                  } disabled:opacity-60`}
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400 dark:text-slate-500" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  {/* Opens the task's detail page — notes, attachments,
                      subtasks and links all live there. */}
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

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    <DueDate value={task.dueDate} muted={done} />
                  </div>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => remove(task)}
                    disabled={busy}
                    aria-label={`Remove "${task.title}" from this project`}
                    title="Remove from project"
                    className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-60"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New task"
        description="This task will be added to the current project."
      >
        <TaskForm
          compact
          hideProjectPicker
          values={values}
          onChange={setValues}
          onSubmit={createTask}
          onCancel={() => setCreating(false)}
          saving={saving}
          submitLabel="Add task"
          pendingLabel="Adding…"
        />
      </Modal>

      <Modal
        size="sm"
        open={assigning}
        onClose={() => setAssigning(false)}
        title="Assign an existing task"
        description="Tasks that aren't in any project yet."
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Task</span>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select a task…</option>
              {available.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setAssigning(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={assignExisting}
              disabled={!selectedId || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Assigning…" : "Assign task"}
            </button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
