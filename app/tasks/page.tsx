import { redirect } from "next/navigation";

import AppLayout from "@/components/layout/AppLayout";
import TasksBoard from "@/components/tasks/TasksBoard";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import { getSession } from "@/lib/session";
import { escapeRegex, serializeTask } from "@/lib/tasks";
import { getProjects } from "@/lib/projects";

export const metadata = { title: "Tasks" };

type Account = { name?: string; email?: string } | null;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const { userId } = session;

  // searchParams is a promise as of Next 15 — awaiting it is required.
  const query = await searchParams;
  const search = query.q?.trim() ?? "";

  // Filter in the query rather than shipping every task and hiding some.
  const filter: Record<string, unknown> = { userId };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: pattern }, { description: pattern }];
  }

  const [account, tasks, projects] = await Promise.all([
    User.findById(userId).select("name email").lean<Account>(),
    Task.find(filter).sort({ createdAt: -1 }).lean(),
    getProjects(userId),
  ]);

  return (
    <AppLayout
      title="Tasks"
      user={{ name: account?.name || "there", email: account?.email ?? "" }}
      defaultQuery={search}
    >
      {/* Rendered on the server so the list is present on first paint — no
          loading flash, and no 401 round-trip for an expired session. */}
      <TasksBoard
        initialTasks={tasks.map(serializeTask)}
        initialCreateOpen={query.new === "1"}
        search={search}
        projects={projects}
      />
    </AppLayout>
  );
}
