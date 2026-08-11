"use client";

import { useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Clock,
  Loader2,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import {
  MAX_HOURS_PER_UPDATE,
  UPDATE_CONTENT_MAX,
  type DailyUpdateDTO,
} from "@/lib/types";

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500";

const label = "text-sm font-medium text-slate-700 dark:text-slate-300";

/** Today as YYYY-MM-DD in local time, matching what the API expects. */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function longDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type FormValues = {
  date: string;
  content: string;
  blocker: string;
  hoursWorked: string;
};

const emptyForm = (): FormValues => ({
  date: today(),
  content: "",
  blocker: "",
  hoursWorked: "",
});

interface DailyUpdatesProps {
  taskId: string;
  initial: DailyUpdateDTO[];
  currentUserId: string;
  totalHours: number;
  readOnly: boolean;
  /** True for task owners and project admins — they can remove others' logs. */
  canModerate: boolean;
}

export default function DailyUpdates({
  taskId,
  initial,
  currentUserId,
  totalHours,
  readOnly,
  canModerate,
}: DailyUpdatesProps) {
  const [updates, setUpdates] = useState(initial);
  const [hours, setHours] = useState(totalHours);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recount = (rows: DailyUpdateDTO[]) =>
    setHours(
      Math.round(rows.reduce((sum, row) => sum + row.hoursWorked, 0) * 4) / 4,
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.content.trim() || saving) return;

    setSaving(true);
    setError(null);

    const payload = {
      date: values.date,
      content: values.content,
      blocker: values.blocker,
      hoursWorked: values.hoursWorked === "" ? 0 : Number(values.hoursWorked),
    };

    const url = editingId
      ? `/api/tasks/${taskId}/updates/${editingId}`
      : `/api/tasks/${taskId}/updates`;

    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to save.");
      setSaving(false);
      return;
    }

    setUpdates(data.updates);
    recount(data.updates);
    setValues(emptyForm());
    setComposing(false);
    setEditingId(null);
    setSaving(false);
  };

  const startEdit = (update: DailyUpdateDTO) => {
    setEditingId(update.id);
    setComposing(true);
    setError(null);
    setValues({
      date: update.date,
      content: update.content,
      blocker: update.blocker,
      hoursWorked: update.hoursWorked ? String(update.hoursWorked) : "",
    });
  };

  const remove = async (id: string) => {
    setBusyId(id);
    setError(null);

    const res = await fetch(`/api/tasks/${taskId}/updates/${id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to delete.");
    } else {
      setUpdates(data.updates);
      recount(data.updates);
    }

    setBusyId(null);
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="Daily updates"
        subtitle={
          updates.length === 0
            ? "A running log of what got done"
            : `${updates.length} entr${updates.length === 1 ? "y" : "ies"} · ${hours}h logged`
        }
        action={
          !readOnly && !composing ? (
            <button
              type="button"
              onClick={() => {
                setValues(emptyForm());
                setEditingId(null);
                setComposing(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Update
            </button>
          ) : undefined
        }
      />

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {composing && (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={label}>Date</span>
              <input
                type="date"
                required
                value={values.date}
                onChange={(event) =>
                  setValues({ ...values, date: event.target.value })
                }
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={label}>Hours worked</span>
              <input
                type="number"
                min={0}
                max={MAX_HOURS_PER_UPDATE}
                step={0.25}
                value={values.hoursWorked}
                onChange={(event) =>
                  setValues({ ...values, hoursWorked: event.target.value })
                }
                placeholder="2.5"
                className={field}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={label}>What did you work on?</span>
            <textarea
              autoFocus
              required
              rows={4}
              maxLength={UPDATE_CONTENT_MAX}
              value={values.content}
              onChange={(event) =>
                setValues({ ...values, content: event.target.value })
              }
              placeholder={"Completed:\n- Analytics API\n- Productivity chart"}
              className={`${field} resize-y`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={label}>
              Blocker{" "}
              <span className="font-normal text-slate-400 dark:text-slate-500">
                (optional)
              </span>
            </span>
            <textarea
              rows={2}
              maxLength={UPDATE_CONTENT_MAX}
              value={values.blocker}
              onChange={(event) =>
                setValues({ ...values, blocker: event.target.value })
              }
              placeholder="Anything holding this up?"
              className={`${field} resize-y`}
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !values.content.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : editingId ? "Save Update" : "Save Update"}
            </button>

            <button
              type="button"
              onClick={() => {
                setComposing(false);
                setEditingId(null);
                setError(null);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {updates.length === 0 && !composing ? (
        <EmptyState
          icon={NotebookPen}
          title="No updates yet"
          message="Add your first work update."
        />
      ) : (
        <ol className="mt-6 space-y-5">
          {updates.map((update) => {
            const mine = update.authorId === currentUserId;
            const busy = busyId === update.id;

            return (
              <li
                key={update.id}
                className="relative border-l-2 border-slate-100 pl-5 dark:border-slate-800"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500"
                />

                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <CalendarDays
                      className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500"
                      aria-hidden="true"
                    />
                    {longDate(update.date)}
                  </p>

                  <span className="inline-flex items-center gap-3">
                    {update.hoursWorked > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {update.hoursWorked} hours
                      </span>
                    )}

                    {!readOnly && mine && (
                      <button
                        type="button"
                        onClick={() => startEdit(update)}
                        aria-label="Edit update"
                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}

                    {!readOnly && (mine || canModerate) && (
                      <button
                        type="button"
                        onClick={() => remove(update.id)}
                        disabled={busy}
                        aria-label="Delete update"
                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </span>
                </div>

                {/* whitespace-pre-line preserves the bullet lists people
                    naturally type, without needing a rich text editor. */}
                <p className="mt-2 text-sm whitespace-pre-line text-slate-600 dark:text-slate-300">
                  {update.content}
                </p>

                {update.blocker && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm whitespace-pre-line text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
                    <TriangleAlert
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    {update.blocker}
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  {update.authorName}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
