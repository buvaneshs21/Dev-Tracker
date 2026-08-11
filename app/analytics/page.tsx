import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";

import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import AnalyticsHeader from "@/components/analytics/AnalyticsHeader";
import AnalyticsStats from "@/components/analytics/AnalyticsStats";
import ProductivityChart from "@/components/analytics/ProductivityChart";
import TaskStatusChart from "@/components/analytics/TaskStatusChart";
import PriorityBreakdown from "@/components/analytics/PriorityBreakdown";
import OverdueTasks from "@/components/analytics/OverdueTasks";
import ProductivityInsights from "@/components/analytics/ProductivityInsights";
import ProjectPerformance from "@/components/analytics/ProjectPerformance";

import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { getAnalytics } from "@/lib/analytics";
import { isAnalyticsRange } from "@/lib/types";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();

  // The proxy handles this already; repeated here so the page is never
  // renderable without a session even if the matcher changes.
  if (!session) redirect("/login");

  await connectDB();

  const query = await searchParams;
  // Anything unrecognised falls back to the default rather than erroring.
  const range = isAnalyticsRange(query.range) ? query.range : "30d";

  const data = await getAnalytics(session.userId, range);

  // The shell lives in layout.tsx, so only this content swaps while loading.
  return (
    <>
      <div className="space-y-8">
        <AnalyticsHeader range={range} />

        {!data.hasAnyTasks ? (
          // Four zeroes beside empty charts reads as broken, not empty.
          <Card className="border-dashed">
            <EmptyState
              icon={BarChart3}
              title="No analytics yet"
              message="Start creating and completing tasks to see your productivity data."
              action={
                <Link
                  href="/tasks?new=1"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
                >
                  Create Task
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <AnalyticsStats overview={data.overview} />

            <ProductivityChart
              data={data.productivity}
              granularity={data.granularity}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <TaskStatusChart statuses={data.statuses} />
              <PriorityBreakdown priorities={data.priorities} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <OverdueTasks stats={data.overdueStats} />
              <ProductivityInsights insights={data.insights} />
            </div>

            <ProjectPerformance projects={data.projects} />
          </>
        )}
      </div>
    </>
  );
}
