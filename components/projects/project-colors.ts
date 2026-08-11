import type { ProjectColor, ProjectStatus } from "@/lib/types";

/**
 * Tailwind compiles class names statically, so colours have to exist as
 * literal strings somewhere. This map is that somewhere — never build a class
 * with `bg-${color}-500`, it produces nothing at build time.
 */
export const PROJECT_COLOR_CLASSES: Record<
  ProjectColor,
  { dot: string; bar: string; tint: string; text: string; ring: string }
> = {
  indigo: {
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
    tint: "bg-indigo-50",
    text: "text-indigo-600",
    ring: "ring-indigo-500",
  },
  violet: {
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    tint: "bg-violet-50",
    text: "text-violet-600",
    ring: "ring-violet-500",
  },
  sky: {
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    tint: "bg-sky-50",
    text: "text-sky-600",
    ring: "ring-sky-500",
  },
  emerald: {
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    tint: "bg-emerald-50",
    text: "text-emerald-600",
    ring: "ring-emerald-500",
  },
  amber: {
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    tint: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-amber-500",
  },
  rose: {
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    tint: "bg-rose-50",
    text: "text-rose-600",
    ring: "ring-rose-500",
  },
};

/** Used for tasks that belong to no project. */
export const NEUTRAL_COLOR_CLASSES = {
  dot: "bg-slate-400",
  bar: "bg-slate-400",
  tint: "bg-slate-50",
  text: "text-slate-600",
  ring: "ring-slate-400",
};

/**
 * Single place that resolves "which colour does this thing wear" — so colours
 * are never hard-coded at call sites.
 */
export function colorClassesFor(color: ProjectColor | null | undefined) {
  return color ? PROJECT_COLOR_CLASSES[color] : NEUTRAL_COLOR_CLASSES;
}

export const PROJECT_STATUS_CLASSES: Record<ProjectStatus, string> = {
  active: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  completed: "bg-green-50 text-green-700 ring-green-200",
  archived: "bg-slate-100 text-slate-600 ring-slate-200",
};
