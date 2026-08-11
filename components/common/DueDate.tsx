import { CalendarClock } from "lucide-react";

interface DueDateProps {
  /** ISO instant, or null when the task has no deadline. */
  value: string | null;
  /** Overdue styling is suppressed for completed tasks. */
  muted?: boolean;
}

function describe(due: Date): { text: string; overdue: boolean } {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfDue = new Date(due);
  startOfDue.setHours(0, 0, 0, 0);

  const days = Math.round(
    (startOfDue.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  if (days === 0) return { text: "Due today", overdue: false };
  if (days === 1) return { text: "Due tomorrow", overdue: false };
  if (days === -1) return { text: "1 day overdue", overdue: true };
  if (days < -1) return { text: `${Math.abs(days)} days overdue`, overdue: true };

  return {
    text: `Due ${due.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    })}`,
    overdue: false,
  };
}

export default function DueDate({ value, muted = false }: DueDateProps) {
  if (!value) return null;

  const { text, overdue } = describe(new Date(value));
  const tone =
    overdue && !muted ? "text-red-600 dark:text-red-400" : muted ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400";

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${tone}`}>
      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}
