"use client";

import MemberCard from "./MemberCard";
import type {
  InvitableRole,
  ProjectMemberDTO,
} from "@/lib/types";

interface MemberListProps {
  members: ProjectMemberDTO[];
  canManage: boolean;
  currentUserId: string;
  busyId: string | null;
  onRoleChange: (member: ProjectMemberDTO, role: InvitableRole) => void;
  onRemove: (member: ProjectMemberDTO) => void;
}

export default function MemberList({
  members,
  canManage,
  currentUserId,
  busyId,
  onRoleChange,
  onRemove,
}: MemberListProps) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          canManage={canManage}
          isSelf={member.userId === currentUserId}
          busy={busyId === member.id}
          onRoleChange={onRoleChange}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
