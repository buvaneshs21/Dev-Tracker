"use client";

import CalendarEventChip from "./CalendarEventChip";
import { colorClassesFor } from "@/components/projects/project-colors";
import { formatDayLabel } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/types";

const MAX_VISIBLE = 3;

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (date: Date) => void;
}

export default function CalendarDay({
  date,
  events,
  inMonth,
  isToday,
  isSelected,
  onSelect,
}: CalendarDayProps) {
  const visible = events.slice(0, MAX_VISIBLE);
  const hidden = events.length - visible.length;
  const hasOverdue = events.some((event) => event.overdue);

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-label={`${formatDayLabel(date)}, ${events.length} event${
        events.length === 1 ? "" : "s"
      }`}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected}
      className={`flex min-h-[76px] flex-col gap-1 border-t border-l border-slate-200 dark:border-slate-800 p-1.5 text-left transition-colors duration-150 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset focus-visible:outline-none sm:min-h-[112px] sm:p-2 ${
        inMonth ? "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800" : "bg-slate-50/60 dark:bg-slate-800/40"
      } ${isSelected ? "ring-2 ring-indigo-500 ring-inset" : ""}`}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
            isToday
              ? "bg-indigo-600 text-white"
              : inMonth
                ? "text-slate-700 dark:text-slate-300"
                : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {date.getDate()}
        </span>

        {hasOverdue && (
          <span
            className="hidden h-1.5 w-1.5 rounded-full bg-red-500 sm:block"
            aria-hidden="true"
          />
        )}
      </span>

      {/* Full chips from `sm` up; dots on narrow screens so cells stay usable. */}
      <span className="hidden flex-col gap-1 sm:flex">
        {visible.map((event) => (
          <CalendarEventChip key={event.id} event={event} />
        ))}

        {hidden > 0 && (
          <span className="px-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            +{hidden} more
          </span>
        )}
      </span>

      <span className="flex flex-wrap gap-1 sm:hidden" aria-hidden="true">
        {events.slice(0, 4).map((event) => (
          <span
            key={event.id}
            className={`h-1.5 w-1.5 rounded-full ${
              event.overdue ? "bg-red-500" : colorClassesFor(event.projectColor).dot
            }`}
          />
        ))}
      </span>
    </button>
  );
}
