import Link from "next/link";
import { Target } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import ProgressRing from "@/components/ui/ProgressRing";

interface WeeklyGoalProps {
  /** Tasks due this week. */
  target: number;
  /** How many of those are already completed. */
  done: number;
}

export default function WeeklyGoal({ target, done }: WeeklyGoalProps) {
  const percent = target === 0 ? 0 : Math.round((done / target) * 100);

  return (
    <Card className="p-6">
      <SectionHeader title="Weekly goal" subtitle="Tasks due this week" />

      {target === 0 ? (
        <EmptyState
          icon={Target}
          title="No deadlines this week"
          message="Give a task a due date and it'll roll up into a weekly goal here."
          action={
            <Link
              href="/tasks?new=1"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Schedule a task
            </Link>
          }
        />
      ) : (
        <div className="mt-6 flex flex-col items-center">
          <ProgressRing
            percent={percent}
            label={`${percent}%`}
            caption={`${done} of ${target} tasks completed`}
          />

          <p className="mt-5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {done} of {target} tasks completed
          </p>
          <p className="mt-1 text-center text-[13px] text-slate-500 dark:text-slate-400">
            {percent === 100
              ? "Goal reached — every deadline met."
              : `${target - done} left to hit this week's goal.`}
          </p>
        </div>
      )}
    </Card>
  );
}
