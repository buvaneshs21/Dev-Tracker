import { AlertTriangle, CheckCircle2, Flag, PlayCircle } from "lucide-react";

import { colorClassesFor } from "@/components/projects/project-colors";
import type { CalendarEvent } from "@/lib/types";

/**
 * One event as it appears inside a day cell. Status is carried by an icon and
 * text as well as colour, so nothing depends on hue alone.
 */
export default function CalendarEventChip({ event }: { event: CalendarEvent }) {
  const colors = colorClassesFor(event.projectColor);
  const done = event.status === "completed";

  const Icon =
    event.type === "project"
      ? Flag
      : event.overdue
        ? AlertTriangle
        : event.kind === "start"
          ? PlayCircle
          : done
            ? CheckCircle2
            : null;

  return (
    <span
      className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] leading-tight transition-colors duration-150 ${
        event.overdue
          ? "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300"
          : done
            ? "bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500"
            : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          event.overdue ? "bg-red-500" : colors.dot
        }`}
      />

      {Icon && (
        <Icon
          className={`h-3 w-3 shrink-0 ${
            event.overdue ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
          }`}
          aria-hidden="true"
        />
      )}

      <span className={`truncate ${done ? "line-through" : ""}`}>
        {event.title}
      </span>
    </span>
  );
}
