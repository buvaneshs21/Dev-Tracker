import { CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";

// Icon + label together, never colour alone — the pill has to survive
// colour-blind readers and greyscale printing.
const STYLES: Record<TaskStatus, { className: string; Icon: typeof Clock3 }> = {
  pending: {
    className: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30",
    Icon: Clock3,
  },
  "in-progress": {
    className: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-500/30",
    Icon: LoaderCircle,
  },
  completed: {
    className: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30",
    Icon: CheckCircle2,
  },
};

export default function StatusPill({ status }: { status: TaskStatus }) {
  const { className, Icon } = STYLES[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
