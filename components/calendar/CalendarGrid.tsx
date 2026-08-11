"use client";

import CalendarDay from "./CalendarDay";
import { buildMonthMatrix, dayKey, isSameDay, weekdayLabels } from "@/lib/dates";
import type { CalendarEvent, WeekStart } from "@/lib/types";

interface CalendarGridProps {
  month: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  selectedDay: string | null;
  onSelect: (date: Date) => void;
  /** From the user's preferences. */
  weekStartsOn: WeekStart;
}

export default function CalendarGrid({
  month,
  eventsByDay,
  selectedDay,
  onSelect,
  weekStartsOn,
}: CalendarGridProps) {
  const days = buildMonthMatrix(month, weekStartsOn);
  const weekdays = weekdayLabels(weekStartsOn);
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border-r border-b border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
        {weekdays.map((day) => (
          <div
            key={day}
            className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date) => {
          const key = dayKey(date);

          return (
            <CalendarDay
              key={key}
              date={date}
              events={eventsByDay.get(key) ?? []}
              inMonth={date.getMonth() === month.getMonth()}
              isToday={isSameDay(date, today)}
              isSelected={selectedDay === key}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
