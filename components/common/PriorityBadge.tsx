import { ChevronDown, ChevronUp, Minus } from "lucide-react";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/types";

// Icon + label together, never colour alone — the badge has to survive
// colour-blind readers and greyscale printing.
const STYLES: Record<
  TaskPriority,
  { className: string; Icon: typeof Minus }
> = {
  low: { className: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300", Icon: ChevronDown },
  medium: { className: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300", Icon: Minus },
  high: { className: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300", Icon: ChevronUp },
};

export default function PriorityBadge({
  priority,
}: {
  priority: TaskPriority;
}) {
  const { className, Icon } = STYLES[priority];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
