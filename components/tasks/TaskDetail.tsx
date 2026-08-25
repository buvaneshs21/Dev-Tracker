"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import StatusPill from "@/components/common/StatusPill";
import PriorityBadge from "@/components/common/PriorityBadge";
import { colorClassesFor } from "@/components/projects/project-colors";
import { useLiveTask } from "@/components/realtime/useLiveTask";
import TaskForm, { type TaskFormValues } from "./TaskForm";
import TaskSidebar from "./TaskSidebar";
import SubtaskList from "./SubtaskList";
import DailyUpdates from "./DailyUpdates";
import TaskAttachments from "./TaskAttachments";
import TaskLinks from "./TaskLinks";
import { toDateInputValue } from "@/lib/dates";
import type { ProjectDTO, TaskDTO, TaskDetailData } from "@/lib/types";

interface TaskDetailProps {
  detail: TaskDetailData;
  projects: ProjectDTO[];
  currentUserId: string;
}

function toFormValues(task: TaskDTO): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId ?? "",
    startDate: toDateInputValue(task.startDate),
    dueDate: toDateInputValue(task.dueDate),
  };
}

export default function TaskDetail({
  detail,
  projects,
  currentUserId,
}: TaskDetailProps) {
  const router = useRouter();

  // Live: patched by socket events, or polled when realtime is unavailable.
  // Local mutations below still setTask directly — incoming events merge
  // idempotently, so the actor's own change coming back is a no-op.
  const { task, setTask, gone } = useLiveTask(detail.task);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<TaskFormValues>(() =>
    toFormValues(detail.task),
  );
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A task that's been deleted (or that you've just lost access to) can't be
  // edited any more, whatever the role said when the page loaded.
  const readOnly = !detail.canEdit || gone;
  const done = task.status === "completed";
  const overdue =
    !done && Boolean(task.dueDate) && new Date(task.dueDate!) < new Date();

  const patch = async (body: Record<string, unknown>) => {
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        router.replace("/login");
        router.refresh();
        return null;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not update the task.",
        );
        return null;
      }

      setTask(data as TaskDTO);
      router.refresh();
      return data as TaskDTO;
    } catch {
      setError("Network error. Check your connection and try again.");
      return null;
    }
  };

  const toggleDone = async () => {
    setBusy(true);
    await patch({ status: done ? "pending" : "completed" });
    setBusy(false);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.title.trim() || saving) return;

    setSaving(true);
    const updated = await patch(values);
    setSaving(false);

    if (updated) {
      setValues(toFormValues(updated));
      setEditing(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not delete the task.",
        );
        setBusy(false);
        return;
      }

      router.replace("/tasks");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Tasks
      </Link>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* The page is left on screen rather than yanked away — you may be
          mid-read, and a sudden redirect loses that. Editing is off, so
          nothing here can be saved against a task that no longer exists. */}
      {gone && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            This task is no longer available — it was deleted, or your access to
            it was removed.{" "}
            <Link href="/tasks" className="font-medium underline">
              Back to tasks
            </Link>
          </span>
        </div>
      )}

      {overdue && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>This task is past its due date.</span>
        </div>
      )}

      <Card className="p-6">
        {editing ? (
          <TaskForm
            values={values}
            onChange={setValues}
            onSubmit={saveEdit}
            onCancel={() => {
              setValues(toFormValues(task));
              setEditing(false);
            }}
            saving={saving}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            projects={projects}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3.5">
                <button
                  type="button"
                  onClick={toggleDone}
                  disabled={busy || readOnly}
                  aria-label={done ? "Reopen task" : "Mark task complete"}
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 ${
                    done
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-300 text-transparent hover:border-green-500 hover:text-green-500 dark:border-slate-700"
                  }`}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>

                <div className="min-w-0">
                  <h2
                    className={`text-2xl font-bold tracking-tight sm:text-3xl ${
                      done
                        ? "text-slate-400 line-through dark:text-slate-500"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {task.title}
                  </h2>

                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <StatusPill status={task.status} />
                    <PriorityBadge priority={task.priority} />

                    {detail.projectName && task.projectId && (
                      <Link
                        href={`/projects/${task.projectId}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${colorClassesFor(detail.projectColor).dot}`}
                        />
                        {detail.projectName}
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!readOnly && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>

                  {detail.canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Description
              </h3>
              {/* whitespace-pre-line keeps paragraphs and line breaks without
                  pulling in a rich text editor. */}
              <p className="mt-2 max-w-3xl text-sm whitespace-pre-line text-slate-600 dark:text-slate-300">
                {task.description || "No description yet."}
              </p>
            </div>
          </>
        )}
      </Card>

      {/* Two columns on desktop; a single stacked column below lg. Comments
          will slot in beneath Daily updates when that phase lands. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SubtaskList
            taskId={task.id}
            initial={detail.subtasks}
            readOnly={readOnly}
          />

          <DailyUpdates
            taskId={task.id}
            initial={detail.updates}
            currentUserId={currentUserId}
            totalHours={detail.totalHours}
            readOnly={readOnly}
            canModerate={detail.canDelete}
          />

          <TaskAttachments
            taskId={task.id}
            initial={detail.attachments}
            currentUserId={currentUserId}
            readOnly={readOnly}
            canModerate={detail.canDelete}
          />

          <TaskLinks
            taskId={task.id}
            initial={detail.links}
            readOnly={readOnly}
          />
        </div>

        <TaskSidebar
          detail={{ ...detail, task }}
          // Withheld entirely when read-only, so the sidebar renders a name
          // rather than a control nobody can use.
          onAssign={
            readOnly
              ? undefined
              : async (assigneeId) => {
                  await patch({ assigneeId });
                }
          }
        />
      </div>

      {confirming && (
        <Modal
          size="sm"
          open
          onClose={() => setConfirming(false)}
          title="Delete task?"
          description="This also removes its subtasks, updates, attachments and links."
        >
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Deleting…" : "Delete Task"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
