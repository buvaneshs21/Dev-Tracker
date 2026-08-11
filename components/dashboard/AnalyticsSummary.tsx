import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

import Card from "@/components/ui/Card";

interface AnalyticsSummaryProps {
  total: number;
  completed: number;
  /** 0–100. */
  completionRate: number;
}

export default function AnalyticsSummary({
  total,
  completed,
  completionRate,
}: AnalyticsSummaryProps) {
  return (
    <Card className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
          <TrendingUp className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Productivity</span>
      </div>

      <p className="mt-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {completionRate}%
      </p>

      <p className="mt-1 text-[13px] text-slate-400 dark:text-slate-500">
        {total === 0
          ? "No tasks tracked yet"
          : `${completed} of ${total} tasks completed`}
      </p>

      <div
        role="progressbar"
        aria-valuenow={completionRate}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Completion rate ${completionRate} percent`}
        className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      <Link
        href="/analytics"
        className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-700 dark:hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        View Analytics
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </Card>
  );
}
