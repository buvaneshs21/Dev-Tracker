import { CheckCircle2, Clock3, LayersIcon, LoaderCircle } from "lucide-react";

import StatsCard from "./StatsCard";
import type { DashboardData } from "@/lib/tasks";

interface StatsGridProps {
  counts: DashboardData["counts"];
  totalDelta: DashboardData["totalDelta"];
  completedDelta: DashboardData["completedDelta"];
}

export default function StatsGrid({
  counts,
  totalDelta,
  completedDelta,
}: StatsGridProps) {
  // No denominator means no percentage — "0% of all tasks" on every card of an
  // empty account reads as a failure state rather than an empty one.
  const share = (value: number) =>
    counts.total === 0
      ? undefined
      : `${Math.round((value / counts.total) * 100)}% of all tasks`;

  return (
    <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        title="Total tasks"
        value={counts.total}
        icon={LayersIcon}
        color="text-slate-600 dark:text-slate-300"
        tint="bg-slate-100 dark:bg-slate-800"
        delta={totalDelta}
        helper={counts.total === 0 ? "Nothing tracked yet" : undefined}
      />

      <StatsCard
        title="Pending"
        value={counts.pending}
        icon={Clock3}
        color="text-amber-600 dark:text-amber-400"
        tint="bg-amber-50 dark:bg-amber-500/15"
        helper={share(counts.pending)}
      />

      <StatsCard
        title="In progress"
        value={counts.inProgress}
        icon={LoaderCircle}
        color="text-indigo-600 dark:text-indigo-400"
        tint="bg-indigo-50 dark:bg-indigo-500/15"
        helper={share(counts.inProgress)}
      />

      <StatsCard
        title="Completed"
        value={counts.completed}
        icon={CheckCircle2}
        color="text-green-600 dark:text-green-400"
        tint="bg-green-50 dark:bg-green-500/15"
        delta={completedDelta}
        helper={share(counts.completed)}
      />
    </section>
  );
}
