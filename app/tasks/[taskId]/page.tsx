import { notFound, redirect } from "next/navigation";

import AppLayout from "@/components/layout/AppLayout";
import TaskDetail from "@/components/tasks/TaskDetail";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import { getProjects } from "@/lib/projects";
import { getTaskDetail } from "@/lib/task-detail";

type Account = { name?: string; email?: string } | null;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const session = await getSession();
  if (!session) return { title: "Task" };

  await connectDB();
  const { taskId } = await params;
  const detail = await getTaskDetail(taskId, session.userId);

  return { title: detail?.task.title ?? "Task" };
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const { taskId } = await params;
  const { userId } = session;

  // Resolves ownership or project role. Someone else's task and a non-existent
  // id both come back null and land on the same 404.
  const detail = await getTaskDetail(taskId, userId);
  if (!detail) notFound();

  const [account, projects] = await Promise.all([
    User.findById(userId).select("name email").lean<Account>(),
    getProjects(userId),
  ]);

  return (
    <AppLayout
      title={detail.task.title}
      user={{ name: account?.name || "there", email: account?.email ?? "" }}
    >
      <TaskDetail
        detail={detail}
        projects={projects}
        currentUserId={userId}
      />
    </AppLayout>
  );
}
