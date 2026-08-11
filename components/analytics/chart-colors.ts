import type { TaskPriority, TaskStatus } from "@/lib/types";

/**
 * Chart colours as CSS custom properties, defined in globals.css.
 *
 * They can't be Tailwind `dark:` classes — SVG fills and strokes aren't
 * utilities — and they can't be plain hex either, or the charts would stay
 * light-themed on a dark page. A `var()` resolves per theme at paint time.
 *
 * Because these are CSS values rather than attribute values, they must be
 * applied via `style={{ fill: … }}`, not `fill={…}`: SVG presentation
 * attributes don't accept var().
 *
 * Both palettes were validated against their own surface. See globals.css for
 * the measured separations.
 */
export const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  pending: "var(--status-pending)",
  "in-progress": "var(--status-in-progress)",
  completed: "var(--status-completed)",
};

export const PRIORITY_CHART_COLORS: Record<TaskPriority, string> = {
  high: "var(--priority-high)",
  medium: "var(--priority-medium)",
  low: "var(--priority-low)",
};

export const PRODUCTIVITY_COLOR = "var(--chart-series)";
export const PRODUCTIVITY_COLOR_SOFT = "var(--chart-series-soft)";

export const CHART_GRID = "var(--chart-grid)";
export const CHART_AXIS_TEXT = "var(--chart-axis)";
export const CHART_TOOLTIP_BG = "var(--chart-tooltip-bg)";
export const CHART_TOOLTIP_FG = "var(--chart-tooltip-fg)";
export const CHART_SURFACE = "var(--chart-surface)";
