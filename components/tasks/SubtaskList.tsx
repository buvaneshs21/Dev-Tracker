"use client";

import { useState } from "react";
import { AlertCircle, Check, ListChecks, Loader2, Plus, Trash2, X } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import { SUBTASK_TITLE_MAX, type SubtaskDTO } from "@/lib/types";

const input =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500";

interface SubtaskListProps {
  taskId: string;
  initial: SubtaskDTO[];
  readOnly: boolean;
}

export default function SubtaskList({
  taskId,
  initial,
  readOnly,
}: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState(initial);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = subtasks.filter((item) => item.completed).length;
  const percent = subtasks.length
    ? Math.round((done / subtasks.length) * 100)
    : 0;

  const call = async (url: string, init: RequestInit) => {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Something went wrong.");
      return null;
    }

    setError(null);
    return data as { subtasks: SubtaskDTO[] };
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || adding) return;

    setAdding(true);
    const data = await call(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    if (data) {
      setSubtasks(data.subtasks);
      setTitle("");
    }
    setAdding(false);
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    const data = await call(`/api/tasks/${taskId}/subtasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (data) setSubtasks(data.subtasks);
    setBusyId(null);
  };

  const remove = async (id: string) => {
    setBusyId(id);
    const data = await call(`/api/tasks/${taskId}/subtasks/${id}`, {
      method: "DELETE",
    });
    if (data) setSubtasks(data.subtasks);
    setBusyId(null);
  };

  const saveEdit = async (event: React.FormEvent, id: string) => {
    event.preventDefault();
    if (!editTitle.trim()) return;
    await patch(id, { title: editTitle });
    setEditingId(null);
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="Subtasks"
        subtitle={
          subtasks.length === 0
            ? "Break this task into smaller steps"
            : `${done} of ${subtasks.length} completed`
        }
        action={
          subtasks.length > 0 ? (
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {percent}%
            </span>
          ) : undefined
        }
      />

      {/* Progress only appears once there's something to measure — a 0% bar on
          an empty checklist implies work that doesn't exist. */}
      {subtasks.length > 0 && (
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${done} of ${subtasks.length} subtasks complete`}
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {subtasks.length === 0 ? (
        <EmptyState
          compact
          icon={ListChecks}
          title="No subtasks yet"
          message="Break this task into smaller steps."
        />
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {subtasks.map((subtask) => {
            const busy = busyId === subtask.id;

            return (
              <li key={subtask.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => patch(subtask.id, { completed: !subtask.completed })}
                  disabled={busy || readOnly}
                  aria-label={`${subtask.completed ? "Reopen" : "Complete"} ${subtask.title}`}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-60 ${
                    subtask.completed
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-300 text-transparent hover:border-green-500 hover:text-green-500 dark:border-slate-700"
                  }`}
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>

                {editingId === subtask.id ? (
                  <form
                    onSubmit={(event) => saveEdit(event, subtask.id)}
                    className="flex flex-1 items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={editTitle}
                      maxLength={SUBTASK_TITLE_MAX}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className={input}
                    />
                    <button
                      type="submit"
                      aria-label="Save"
                      className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/15"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        setEditingId(subtask.id);
                        setEditTitle(subtask.title);
                      }}
                      className={`flex-1 text-left text-sm transition-colors disabled:cursor-default ${
                        subtask.completed
                          ? "text-slate-400 line-through dark:text-slate-500"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {subtask.title}
                    </button>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => remove(subtask.id)}
                        disabled={busy}
                        aria-label={`Delete ${subtask.title}`}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <form onSubmit={add} className="mt-4 flex items-center gap-2">
          <input
            value={title}
            maxLength={SUBTASK_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a subtask…"
            className={input}
          />
          <button
            type="submit"
            disabled={adding || !title.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            Add
          </button>
        </form>
      )}
    </Card>
  );
}
