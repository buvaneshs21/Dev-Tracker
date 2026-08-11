"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, PieChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import { STATUS_CHART_COLORS } from "./chart-colors";
import { STATUS_LABELS, type TaskStatus, type TaskStatusSlice } from "@/lib/types";

const SIZE = 180;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3; // surface gap between segments, in path units

const ICONS: Record<TaskStatus, LucideIcon> = {
  pending: Clock3,
  "in-progress": LoaderCircle,
  completed: CheckCircle2,
};

export default function TaskStatusChart({
  statuses,
}: {
  statuses: TaskStatusSlice[];
}) {
  const [active, setActive] = useState<TaskStatus | null>(null);

  const total = statuses.reduce((sum, slice) => sum + slice.count, 0);
  const present = statuses.filter((slice) => slice.count > 0);

  // Offsets are derived rather than accumulated in a mutable during render.
  // Only a handful of segments, so the repeated scan costs nothing.
  const segments = present.map((slice, index) => {
    const preceding = present
      .slice(0, index)
      .reduce((sum, earlier) => sum + earlier.count, 0);

    const length = (slice.count / total) * CIRCUMFERENCE;
    // Only inset a gap when more than one segment is drawn, otherwise a single
    // full ring would show a false notch.
    const drawn = present.length > 1 ? Math.max(length - GAP, 0.5) : length;

    return {
      status: slice.status,
      dash: `${drawn} ${CIRCUMFERENCE - drawn}`,
      offset: -(preceding / total) * CIRCUMFERENCE,
    };
  });

  return (
    <Card className="p-6">
      <SectionHeader title="Task status" subtitle="Share of tasks created" />

      {total === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No tasks in this period"
          message="Create a task to see how your work breaks down."
        />
      ) : (
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <div className="relative shrink-0">
            <svg
              width={SIZE}
              height={SIZE}
              role="img"
              aria-label={`Task status breakdown of ${total} tasks.`}
              className="-rotate-90"
            >
              {segments.map((segment) => (
                <circle
                  key={segment.status}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  style={{ stroke: STATUS_CHART_COLORS[segment.status] }}
                  strokeWidth={STROKE}
                  strokeDasharray={segment.dash}
                  strokeDashoffset={segment.offset}
                  opacity={active === null || active === segment.status ? 1 : 0.4}
                  onMouseEnter={() => setActive(segment.status)}
                  onMouseLeave={() => setActive(null)}
                  className="transition-opacity duration-200"
                />
              ))}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{total}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">tasks</span>
            </div>
          </div>

          {/* Legend carries icon, label and value — identity never rests on hue. */}
          <ul className="w-full space-y-3">
            {statuses.map((slice) => {
              const Icon = ICONS[slice.status];

              return (
                <li
                  key={slice.status}
                  onMouseEnter={() => setActive(slice.status)}
                  onMouseLeave={() => setActive(null)}
                  className="flex items-center gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: STATUS_CHART_COLORS[slice.status],
                    }}
                  />

                  <Icon
                    className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
                    aria-hidden="true"
                  />

                  <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">
                    {STATUS_LABELS[slice.status]}
                  </span>

                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {slice.count}
                  </span>
                  <span className="w-10 text-right text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                    {slice.percent}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
