"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import {
  PROJECT_COLORS,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectColor,
  type ProjectStatus,
} from "@/lib/types";
import { PROJECT_COLOR_CLASSES } from "./project-colors";

export type ProjectFormValues = {
  name: string;
  description: string;
  color: ProjectColor;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
};

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  name: "",
  description: "",
  color: "indigo",
  status: "active",
  startDate: "",
  dueDate: "",
};

type FieldErrors = Partial<Record<keyof ProjectFormValues, string>>;

/** Mirrors the server rules so users see problems before a round-trip. */
export function validateProjectForm(values: ProjectFormValues): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Project name is required";
  else if (name.length > PROJECT_NAME_MAX)
    errors.name = `Keep it under ${PROJECT_NAME_MAX} characters`;

  if (values.description.length > PROJECT_DESCRIPTION_MAX)
    errors.description = `Keep it under ${PROJECT_DESCRIPTION_MAX} characters`;

  if (values.startDate && values.dueDate && values.dueDate < values.startDate)
    errors.dueDate = "Due date cannot be before the start date";

  return errors;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";
const errorClass = "text-xs text-red-600 dark:text-red-400";

interface ProjectFormProps {
  values: ProjectFormValues;
  onChange: (values: ProjectFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  pendingLabel: string;
  saving: boolean;
  /** Error returned by the API, as opposed to a field-level problem. */
  formError?: string | null;
}

export default function ProjectForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  pendingLabel,
  saving,
  formError,
}: ProjectFormProps) {
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateProjectForm(values);
  const visible: FieldErrors = showErrors ? errors : {};

  const set = <K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) => onChange({ ...values, [key]: value });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);

    // Guards against a double submit as well as an invalid one.
    if (Object.keys(errors).length > 0 || saving) return;
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Project name</span>
        <input
          autoFocus
          value={values.name}
          maxLength={PROJECT_NAME_MAX + 1}
          onChange={(event) => set("name", event.target.value)}
          placeholder="DevTrack"
          aria-invalid={Boolean(visible.name)}
          className={inputClass}
        />
        {visible.name && <span className={errorClass}>{visible.name}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>
          Description <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
        </span>
        <textarea
          rows={2}
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="What is this project about?"
          aria-invalid={Boolean(visible.description)}
          className={`${inputClass} resize-y`}
        />
        {visible.description && (
          <span className={errorClass}>{visible.description}</span>
        )}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Colour</legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((color) => {
            const selected = values.color === color;

            return (
              <button
                key={color}
                type="button"
                onClick={() => set("color", color)}
                aria-label={color}
                aria-pressed={selected}
                className={`h-8 w-8 rounded-full transition-all duration-200 ${
                  PROJECT_COLOR_CLASSES[color].dot
                } ${
                  selected
                    ? "ring-2 ring-slate-900 ring-offset-2"
                    : "hover:scale-110"
                } focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none`}
              />
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Status</span>
          <select
            value={values.status}
            onChange={(event) =>
              set("status", event.target.value as ProjectStatus)
            }
            className={inputClass}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
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
            aria-invalid={Boolean(visible.dueDate)}
            className={inputClass}
          />
        </label>
      </div>

      {visible.dueDate && <span className={errorClass}>{visible.dueDate}</span>}

      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <div className="mt-1 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
