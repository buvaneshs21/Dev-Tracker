"use client";

import { Loader2 } from "lucide-react";

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ProjectDTO,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

export type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** "" means "No project". */
  projectId: string;
  startDate: string;
  dueDate: string;
};

export const EMPTY_TASK_FORM: TaskFormValues = {
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  projectId: "",
  startDate: "",
  dueDate: "",
};

interface TaskFormProps {
  values: TaskFormValues;
  onChange: (values: TaskFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  pendingLabel: string;
  saving: boolean;
  /** Editing an existing task keeps the layout tighter. */
  compact?: boolean;
  /** Projects offered in the picker. Omitted when there are none. */
  projects?: ProjectDTO[];
  /** Hides the picker — used on a project page, where the project is implied. */
  hideProjectPicker?: boolean;
}

export const inputClass =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";

/** Shared by the create panel and the inline editor so the two never drift. */
export default function TaskForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  pendingLabel,
  saving,
  compact = false,
  projects = [],
  hideProjectPicker = false,
}: TaskFormProps) {
  const set = <K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K],
  ) => onChange({ ...values, [key]: value });

  const showProjectPicker = !hideProjectPicker && projects.length > 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Title</span>
        <input
          autoFocus
          required
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="What needs doing?"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>
          Description <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
        </span>
        <textarea
          rows={compact ? 2 : 3}
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Any detail worth remembering…"
          className={`${inputClass} resize-y`}
        />
      </label>

      {showProjectPicker && (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Project</span>
          <select
            value={values.projectId}
            onChange={(event) => set("projectId", event.target.value)}
            className={inputClass}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Status</span>
          <select
            value={values.status}
            onChange={(event) => set("status", event.target.value as TaskStatus)}
            className={inputClass}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Priority</span>
          <select
            value={values.priority}
            onChange={(event) =>
              set("priority", event.target.value as TaskPriority)
            }
            className={inputClass}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Start date</span>
          <input
            type="date"
            value={values.startDate}
            onChange={(event) => set("startDate", event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Due date</span>
          <input
            type="date"
            value={values.dueDate}
            onChange={(event) => set("dueDate", event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !values.title.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? pendingLabel : submitLabel}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
