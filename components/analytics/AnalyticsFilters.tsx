import Link from "next/link";

import {
  ANALYTICS_RANGES,
  ANALYTICS_RANGE_LABELS,
  type AnalyticsRange,
} from "@/lib/types";

/**
 * Links rather than client state: the range selects what the server queries, so
 * the URL is the source of truth and a range is shareable.
 */
export default function AnalyticsFilters({
  active,
}: {
  active: AnalyticsRange;
}) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="flex flex-wrap gap-2 overflow-x-auto"
    >
      {ANALYTICS_RANGES.map((range) => {
        const selected = range === active;

        return (
          <Link
            key={range}
            href={`/analytics?range=${range}`}
            aria-current={selected ? "true" : undefined}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
              selected
                ? "bg-slate-900 dark:bg-slate-700 text-white shadow-sm"
                : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {ANALYTICS_RANGE_LABELS[range]}
          </Link>
        );
      })}
    </div>
  );
}
