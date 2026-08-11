import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  /** Optional call to action — a link or a button. */
  action?: ReactNode;
  compact?: boolean;
}

/** Every panel uses this rather than rendering blank space when it has no data. */
export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? "py-8" : "py-14"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{message}</p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
