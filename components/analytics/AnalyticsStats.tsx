import { CheckCircle2, LayersIcon, LoaderCircle, Target } from "lucide-react";

import AnalyticsStatCard from "./AnalyticsStatCard";
import type { AnalyticsOverview } from "@/lib/types";

export default function AnalyticsStats({
  overview,
}: {
  overview: AnalyticsOverview;
}) {
  const { total, completed, inProgress, pending, completionRate } = overview;

  return (
    <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <AnalyticsStatCard
        label="Total tasks"
        value={String(total)}
        icon={LayersIcon}
        color="text-slate-600 dark:text-slate-300"
        tint="bg-slate-100 dark:bg-slate-800"
        hint={total === 0 ? "Nothing in this period" : `${pending} still pending`}
      />

      <AnalyticsStatCard
        label="Completed"
        value={String(completed)}
        icon={CheckCircle2}
        color="text-green-700 dark:text-green-300"
        tint="bg-green-50 dark:bg-green-500/15"
        hint={total === 0 ? "" : `of ${total} tasks`}
      />

      <AnalyticsStatCard
        label="In progress"
        value={String(inProgress)}
        icon={LoaderCircle}
        color="text-indigo-600 dark:text-indigo-400"
        tint="bg-indigo-50 dark:bg-indigo-500/15"
        hint={total === 0 ? "" : `${Math.round((inProgress / total) * 100)}% of all tasks`}
      />

      <AnalyticsStatCard
        label="Completion rate"
        value={`${completionRate}%`}
        icon={Target}
        color="text-amber-600 dark:text-amber-400"
        tint="bg-amber-50 dark:bg-amber-500/15"
        hint={total === 0 ? "" : `${completed} of ${total} done`}
      />
    </section>
  );
}
