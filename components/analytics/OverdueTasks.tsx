import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import type { OverdueStats } from "@/lib/types";

export default function OverdueTasks({ stats }: { stats: OverdueStats }) {
  const healthy = stats.overdue === 0;

  return (
    <Card className="p-6">
      <SectionHeader
        title="Deadlines"
        subtitle="Current state, not limited to the selected range"
      />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div
          className={`rounded-xl p-5 ${
            healthy ? "bg-green-50 dark:bg-green-500/15" : "bg-red-50 dark:bg-red-500/15"
          }`}
        >
          <div className="flex items-center gap-2">
            {healthy ? (
              <CheckCircle2
                className="h-4 w-4 text-green-700 dark:text-green-300"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            )}
            <span
              className={`text-sm font-medium ${
                healthy ? "text-green-800 dark:text-green-200" : "text-red-700 dark:text-red-300"
              }`}
            >
              Overdue tasks
            </span>
          </div>

          <p
            className={`mt-3 text-4xl font-bold tracking-tight ${
              healthy ? "text-green-800 dark:text-green-200" : "text-red-700 dark:text-red-300"
            }`}
          >
            {stats.overdue}
          </p>

          <p
            className={`mt-1 text-[13px] ${
              healthy ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-400"
            }`}
          >
            {healthy ? (
              "Nothing past its due date."
            ) : (
              <Link href="/tasks" className="underline underline-offset-2">
                Review them in Tasks
              </Link>
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            On-time completion
          </span>

          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`}
          </p>

          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            {stats.onTimeRate === null
              ? "No completed task has had a due date yet."
              : `${stats.onTime} of ${stats.completedWithDueDate} finished by their due date.`}
          </p>
        </div>
      </div>
    </Card>
  );
}
