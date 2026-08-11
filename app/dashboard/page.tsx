import { redirect } from "next/navigation";

import AppLayout from "@/components/layout/AppLayout";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsGrid from "@/components/dashboard/StatsGrid";
import ProductivityChart from "@/components/dashboard/ProductivityChart";
import TodayTasks from "@/components/dashboard/TodayTasks";
import WeeklyGoal from "@/components/dashboard/WeeklyGoal";
import RecentActivity from "@/components/dashboard/RecentActivity";
import ActiveProjects from "@/components/dashboard/ActiveProjects";
import UpcomingTasks from "@/components/calendar/UpcomingTasks";
import AnalyticsSummary from "@/components/dashboard/AnalyticsSummary";
import QuickActions from "@/components/dashboard/QuickActions";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import { getDashboardData } from "@/lib/tasks";
import { getProjects } from "@/lib/projects";
import { getOverdueTasks, getUpcomingTasks } from "@/lib/calendar";
import { getAnalyticsSummary } from "@/lib/analytics";
import { getCollaboratorCount } from "@/lib/members";

export const metadata = { title: "Dashboard" };

type Account = { name?: string; email?: string } | null;

export default async function DashboardPage() {
  const session = await getSession();

  // The proxy handles this already; repeated here so the page is never
  // renderable without a session even if the matcher changes.
  if (!session) redirect("/login");

  await connectDB();

  const [account, data, projects, upcoming, overdue, summary, collaborators] =
    await Promise.all([
    User.findById(session.userId).select("name email").lean<Account>(),
    getDashboardData(session.userId),
    getProjects(session.userId, { status: "active" }),
    getUpcomingTasks(session.userId, 4),
    getOverdueTasks(session.userId, 3),
    getAnalyticsSummary(session.userId),
    getCollaboratorCount(session.userId),
  ]);

  const name = account?.name || "there";
  const open = data.counts.pending + data.counts.inProgress;

  return (
    <AppLayout title="Dashboard" user={{ name, email: account?.email ?? "" }}>
      <div className="space-y-8">
        <DashboardHeader name={name} total={data.counts.total} open={open} />

        <StatsGrid
          counts={data.counts}
          totalDelta={data.totalDelta}
          completedDelta={data.completedDelta}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ProductivityChart series={data.series} />
            <TodayTasks tasks={data.todayTasks} />
          </div>

          <div className="space-y-6">
            <UpcomingTasks
              tasks={upcoming}
              overdue={overdue}
              showCalendarLink
            />
            <ActiveProjects
              projects={projects.slice(0, 3)}
              activeCount={projects.length}
              collaboratorCount={collaborators}
            />
            <WeeklyGoal
              target={data.weeklyGoal.target}
              done={data.weeklyGoal.done}
            />
            <RecentActivity tasks={data.recent} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>

          <AnalyticsSummary
            total={summary.total}
            completed={summary.completed}
            completionRate={summary.completionRate}
          />
        </div>
      </div>
    </AppLayout>
  );
}
