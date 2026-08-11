import { redirect } from "next/navigation";

import AppLayout from "@/components/layout/AppLayout";
import ProjectsBoard from "@/components/projects/ProjectsBoard";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import { getProjects } from "@/lib/projects";

export const metadata = { title: "Projects" };

type Account = { name?: string; email?: string } | null;

export default async function ProjectsPage() {
  const session = await getSession();

  // The proxy handles this already; repeated here so the page is never
  // renderable without a session even if the matcher changes.
  if (!session) redirect("/login");

  await connectDB();

  const [account, projects] = await Promise.all([
    User.findById(session.userId).select("name email").lean<Account>(),
    getProjects(session.userId),
  ]);

  return (
    <AppLayout
      title="Projects"
      user={{ name: account?.name || "there", email: account?.email ?? "" }}
    >
      {/* Rendered on the server so the grid is present on first paint. */}
      <ProjectsBoard initialProjects={projects} />
    </AppLayout>
  );
}
