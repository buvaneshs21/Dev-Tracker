import AnalyticsFilters from "./AnalyticsFilters";
import { ANALYTICS_RANGE_LABELS, type AnalyticsRange } from "@/lib/types";

export default function AnalyticsHeader({ range }: { range: AnalyticsRange }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Analytics
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          How your work is going —{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {ANALYTICS_RANGE_LABELS[range].toLowerCase()}
          </span>
          .
        </p>
      </div>

      <AnalyticsFilters active={range} />
    </section>
  );
}
