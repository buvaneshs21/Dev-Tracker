import { redirect } from "next/navigation";

import CalendarBoard from "@/components/calendar/CalendarBoard";

import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { getProjects } from "@/lib/projects";
import { getUserPreferences } from "@/lib/preferences";
import {
  getCalendarEvents,
  getOverdueTasks,
  getUpcomingTasks,
} from "@/lib/calendar";
import {
  addDays,
  endOfDay,
  parseMonthParam,
  startOfMonth,
  startOfWeek,
  toMonthParam,
} from "@/lib/dates";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();

  // The proxy handles this already; repeated here so the page is never
  // renderable without a session even if the matcher changes.
  if (!session) redirect("/login");

  await connectDB();

  const { userId } = session;
  const query = await searchParams;
  const month = parseMonthParam(query.month);

  // The window depends on which day the week starts on, so preferences are read
  // before the range is computed.
  const preferences = await getUserPreferences(userId);

  // The grid always shows six weeks, so fetch that whole span — otherwise
  // events on the leading/trailing days would be missing. Only this window is
  // queried, never the full collection.
  const rangeStart = startOfWeek(startOfMonth(month), preferences.weekStartsOn);
  const rangeEnd = endOfDay(addDays(rangeStart, 41));

  const [events, projects, upcoming, overdue] = await Promise.all([
    getCalendarEvents(userId, rangeStart, rangeEnd),
    getProjects(userId),
    getUpcomingTasks(userId, 5),
    getOverdueTasks(userId, 5),
  ]);

  // The shell lives in layout.tsx, so only this content swaps while loading.
  return (
    <CalendarBoard
      month={toMonthParam(month)}
      events={events}
      projects={projects}
      upcoming={upcoming}
      overdue={overdue}
      weekStartsOn={preferences.weekStartsOn}
    />
  );
}
