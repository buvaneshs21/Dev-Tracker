import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import Card from "@/components/ui/Card";
import type { StatDelta } from "@/lib/tasks";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  /** Text colour for the icon. */
  color: string;
  /** Background tint behind the icon. */
  tint: string;
  /** Shown when there is no comparable previous period. */
  helper?: string;
  delta?: StatDelta | null;
  /** False when a rising number is bad news (e.g. overdue work). */
  positiveIsGood?: boolean;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  tint,
  helper,
  delta,
  positiveIsGood = true,
}: StatsCardProps) {
  const good = delta
    ? delta.direction === "flat"
      ? null
      : (delta.direction === "up") === positiveIsGood
    : null;

  const DeltaIcon =
    delta?.direction === "up"
      ? ArrowUpRight
      : delta?.direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <Card interactive className="p-6">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint} ${color}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>

        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
      </div>

      <p className="mt-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </p>

      <div className="mt-2 flex h-5 items-center gap-1.5 text-[13px]">
        {delta ? (
          <>
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                good === null
                  ? "text-slate-500 dark:text-slate-400"
                  : good
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {delta.percent}%
            </span>
            <span className="text-slate-400 dark:text-slate-500">{delta.caption}</span>
          </>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">{helper ?? ""}</span>
        )}
      </div>
    </Card>
  );
}
