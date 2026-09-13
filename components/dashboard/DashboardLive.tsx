"use client";

import { createContext, useContext, type ReactNode } from "react";

import StatsGrid from "./StatsGrid";
import UpcomingTasks from "@/components/calendar/UpcomingTasks";
import { useDashboardSummary } from "@/components/realtime/useDashboardSummary";
import type { DashboardSummary } from "@/lib/dashboard";
import type { DashboardData } from "@/lib/tasks";

/**
 * The client boundary for the dashboard's live parts.
 *
 * Deliberately narrow. The page stays a server component — the productivity
 * chart, weekly goal, recent activity, projects and quick actions are all
 * still rendered on the server and passed through as `children`, which a
 * client component can do without pulling them into the bundle. Converting the
 * whole dashboard to a client component to get live counters would have traded
 * server rendering away for nothing.
 *
 * The subscription lives here, in one place, rather than in each consumer:
 * two components each calling the hook would mean two socket listeners, two
 * timers and two refetches per event, plus two copies of state that could
 * disagree mid-flight.
 */
const SummaryContext = createContext<DashboardSummary | null>(null);

function useSummary(): DashboardSummary {
  const summary = useContext(SummaryContext);

  if (!summary) {
    throw new Error("Dashboard section rendered outside <DashboardRealtime>");
  }

  return summary;
}

export function DashboardRealtime({
  initial,
  children,
}: {
  /** Rendered on the server, so the first paint is correct and complete. */
  initial: DashboardSummary;
  children: ReactNode;
}) {
  const summary = useDashboardSummary(initial);

  return (
    <SummaryContext.Provider value={summary}>
      {children}
    </SummaryContext.Provider>
  );
}

/**
 * The four counters.
 *
 * The deltas are passed through from the server rather than tracked live: they
 * compare this week with last week and cannot meaningfully change from a
 * single task event.
 */
export function LiveStats({
  totalDelta,
  completedDelta,
}: {
  totalDelta: DashboardData["totalDelta"];
  completedDelta: DashboardData["completedDelta"];
}) {
  const { counts } = useSummary();

  return (
    <StatsGrid
      counts={counts}
      totalDelta={totalDelta}
      completedDelta={completedDelta}
    />
  );
}

export function LiveUpcoming() {
  const { upcoming, overdue } = useSummary();

  return <UpcomingTasks tasks={upcoming} overdue={overdue} showCalendarLink />;
}
