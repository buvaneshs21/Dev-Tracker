import { notFound, redirect } from "next/navigation";

import AppLayout from "@/components/layout/AppLayout";
import ProjectDetail from "@/components/projects/ProjectDetail";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import { getSession } from "@/lib/session";
import { getProjectById } from "@/lib/projects";
import { getProjectMembers } from "@/lib/members";
import { getPendingInvitations } from "@/lib/invitations";
import { roleCan } from "@/lib/permissions";
import { serializeTask } from "@/lib/tasks";

type Account = { name?: string; email?: string } | null;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSession();
  if (!session) return { title: "Project" };

  await connectDB();
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.userId);

  return { title: project?.name ?? "Project" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const { projectId } = await params;
  const { userId } = session;

  // getProjectById resolves membership (owner or joined). A stranger's project
  // and a non-existent id both come back null and land on the same 404.
  const project = await getProjectById(projectId, userId);
  if (!project) notFound();

  const canManageMembers = roleCan(project.role, "members:manage");

  const [account, tasks, unassigned, members, invitations] = await Promise.all([
    User.findById(userId).select("name email").lean<Account>(),
    // Project-wide, not just the caller's: that's the point of collaboration.
    // Access was authorised above.
    Task.find({ projectId }).sort({ createdAt: -1 }).lean(),
    // Only *my* loose tasks are offered for assignment — I can't pull someone
    // else's personal task into a shared project.
    Task.find({ userId, projectId: null })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    getProjectMembers(projectId),
    canManageMembers ? getPendingInvitations(projectId) : Promise.resolve([]),
  ]);

  return (
    <AppLayout
      title={project.name}
      user={{ name: account?.name || "there", email: account?.email ?? "" }}
    >
      <ProjectDetail
        project={project}
        tasks={tasks.map(serializeTask)}
        unassignedTasks={unassigned.map(serializeTask)}
        members={members}
        invitations={invitations}
        currentUserId={userId}
      />
    </AppLayout>
  );
}
