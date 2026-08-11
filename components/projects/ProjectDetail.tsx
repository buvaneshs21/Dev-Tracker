"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";

import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import ProjectHeader from "./ProjectHeader";
import ProjectStats from "./ProjectStats";
import ProjectTasks from "./ProjectTasks";
import ProjectMembers from "./ProjectMembers";
import ProjectFormDialog from "./ProjectFormDialog";
import DeleteProjectDialog from "./DeleteProjectDialog";
import { roleCan } from "@/lib/roles";
import type {
  ProjectDTO,
  ProjectInvitationDTO,
  ProjectMemberDTO,
  ProjectWithStats,
  TaskDTO,
} from "@/lib/types";

type Tab = "overview" | "tasks" | "members" | "activity";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "tasks", label: "Tasks" },
  { value: "members", label: "Members" },
  { value: "activity", label: "Activity" },
];

interface ProjectDetailProps {
  project: ProjectWithStats;
  tasks: TaskDTO[];
  unassignedTasks: TaskDTO[];
  members: ProjectMemberDTO[];
  invitations: ProjectInvitationDTO[];
  currentUserId: string;
}

export default function ProjectDetail({
  project: initialProject,
  tasks,
  unassignedTasks,
  members,
  invitations,
  currentUserId,
}: ProjectDetailProps) {
  const router = useRouter();

  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Mirrors of the server's rules, used only to decide which controls to show.
  // Every one of these is enforced again server-side.
  const canEdit = roleCan(project.role, "project:edit");
  const canDelete = roleCan(project.role, "project:delete");
  const canManageMembers = roleCan(project.role, "members:manage");
  const canCreateTask = roleCan(project.role, "task:create");

  const handleSaved = (saved: ProjectDTO) => {
    // Stats, member count and role are unaffected by editing the project.
    setProject((prev) => ({
      ...saved,
      stats: prev.stats,
      memberCount: prev.memberCount,
      role: prev.role,
    }));
    router.refresh();
  };

  const handleDeleted = () => {
    router.replace("/projects");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <ProjectHeader
        project={project}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      <SegmentedTabs
        label="Project sections"
        options={TABS}
        value={tab}
        onChange={setTab}
      />

      {tab === "overview" && <ProjectStats project={project} />}

      {tab === "tasks" && (
        <ProjectTasks
          projectId={project.id}
          initialTasks={tasks}
          unassignedTasks={unassignedTasks}
          readOnly={!canCreateTask}
        />
      )}

      {tab === "members" && (
        <ProjectMembers
          projectId={project.id}
          projectName={project.name}
          currentUserId={currentUserId}
          role={project.role}
          canManage={canManageMembers}
          initialMembers={members}
          initialInvitations={invitations}
        />
      )}

      {tab === "activity" && (
        <Card className="border-dashed">
          <EmptyState
            icon={Activity}
            title="Activity is coming soon"
            message="Project events like members joining and tasks being completed will appear here."
          />
        </Card>
      )}

      {editOpen && (
        <ProjectFormDialog
          project={project}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {deleteOpen && (
        <DeleteProjectDialog
          project={project}
          onClose={() => setDeleteOpen(false)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
