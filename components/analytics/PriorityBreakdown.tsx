import { BarChart3 } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import { PRIORITY_CHART_COLORS } from "./chart-colors";
import { PRIORITY_LABELS, type PrioritySlice } from "@/lib/types";

export default function PriorityBreakdown({
  priorities,
}: {
  priorities: PrioritySlice[];
}) {
  const total = priorities.reduce((sum, slice) => sum + slice.count, 0);
  const max = Math.max(...priorities.map((slice) => slice.count), 1);

  return (
    <Card className="p-6">
      <SectionHeader title="Priority" subtitle="Where your work sits" />

      {total === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No tasks in this period"
          message="Priorities appear once you have tasks in this range."
        />
      ) : (
        <ul className="mt-6 space-y-5">
          {priorities.map((slice) => (
            <li key={slice.priority}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {PRIORITY_LABELS[slice.priority]}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {slice.count}
                  </span>
                  <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                    {slice.percent}%
                  </span>
                </span>
              </div>

              <div
                role="progressbar"
                aria-valuenow={slice.count}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={`${PRIORITY_LABELS[slice.priority]} priority: ${slice.count} tasks`}
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(slice.count / max) * 100}%`,
                    backgroundColor: PRIORITY_CHART_COLORS[slice.priority],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
