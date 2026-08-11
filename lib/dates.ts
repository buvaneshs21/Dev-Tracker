import type { WeekStart } from "./types";

/**
 * Local-time date helpers. Everything here deliberately avoids UTC:
 * `new Date("2026-08-04")` is UTC midnight, which renders as the 3rd west of
 * Greenwich and marks a task due today as already overdue.
 */

/**
 * Parses a date from request input.
 *
 * A bare "YYYY-MM-DD" becomes *local* end-of-day, so a task due today stays
 * due until midnight rather than going overdue at 00:00.
 */
export function parseDueDate(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Like parseDueDate but anchored to the *start* of the day — for start dates. */
export function parseStartDate(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** ISO instant -> the "YYYY-MM-DD" a date input expects, in local time. */
export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return dayKey(new Date(iso));
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/**
 * Start of the week containing `date`.
 *
 * Monday by default — every existing caller relied on that — but the user's
 * `weekStartsOn` preference overrides it, so the calendar grid and the weekly
 * goal agree with what they picked.
 */
export function startOfWeek(
  date: Date,
  weekStartsOn: WeekStart = "monday",
): Date {
  const day = startOfDay(date).getDay(); // 0 = Sunday
  const offset = weekStartsOn === "monday" ? (day + 6) % 7 : day;
  return addDays(startOfDay(date), -offset);
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Weekday headers in the order the grid will render them. */
export function weekdayLabels(weekStartsOn: WeekStart = "monday"): string[] {
  return weekStartsOn === "monday"
    ? WEEKDAY_LABELS
    : [WEEKDAY_LABELS[6], ...WEEKDAY_LABELS.slice(0, 6)];
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

/** Local "YYYY-MM-DD". The stable key used to bucket events onto days. */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** Parses "YYYY-MM" from the URL; falls back to the current month. */
export function parseMonthParam(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    if (month >= 1 && month <= 12) return new Date(year, month - 1, 1);
  }
  return startOfMonth(new Date());
}

export function toMonthParam(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * The six-week grid a month view renders: always 42 days, with leading and
 * trailing days from the neighbouring months. A fixed count keeps the grid from
 * changing height as the user pages through months.
 */
export function buildMonthMatrix(
  month: Date,
  weekStartsOn: WeekStart = "monday",
): Date[] {
  const first = startOfWeek(startOfMonth(month), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** "Today" / "Tomorrow" / "Aug 12" — used by the upcoming list. */
export function relativeDayLabel(iso: string): string {
  const date = new Date(iso);
  const days = Math.round(
    (startOfDay(date).getTime() - startOfDay(new Date()).getTime()) /
      86_400_000,
  );

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";

  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
