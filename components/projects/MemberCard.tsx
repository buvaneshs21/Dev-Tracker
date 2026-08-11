"use client";

import { Loader2, Trash2 } from "lucide-react";

import MemberRoleSelect from "./MemberRoleSelect";
import {
  ROLE_LABELS,
  type InvitableRole,
  type ProjectMemberDTO,
  type ProjectRole,
} from "@/lib/types";

const ROLE_BADGE: Record<ProjectRole, string> = {
  owner: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-500/30",
  admin: "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-500/30",
  member: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-slate-700",
  viewer: "bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-700",
};

interface MemberCardProps {
  member: ProjectMemberDTO;
  /** True when the viewer holds members:manage. */
  canManage: boolean;
  /** True when this row is the signed-in user. */
  isSelf: boolean;
  busy: boolean;
  onRoleChange: (member: ProjectMemberDTO, role: InvitableRole) => void;
  onRemove: (member: ProjectMemberDTO) => void;
}

export default function MemberCard({
  member,
  canManage,
  isSelf,
  busy,
  onRoleChange,
  onRemove,
}: MemberCardProps) {
  const initial = (member.name || member.email || "?").charAt(0).toUpperCase();
  const isOwner = member.role === "owner";

  // The owner is immutable from here: their role follows Project.ownerId and
  // removing them would leave the project ownerless.
  const editable = canManage && !isOwner;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
        {initial}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {member.name}
          {isSelf && <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">(you)</span>}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
      </div>

      <span className="text-xs text-slate-400 dark:text-slate-500">
        Joined{" "}
        {new Date(member.joinedAt).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>

      {editable ? (
        <MemberRoleSelect
          label={`Role for ${member.name}`}
          value={member.role as InvitableRole}
          disabled={busy}
          onChange={(role) => onRoleChange(member, role)}
        />
      ) : (
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE[member.role]}`}
        >
          {ROLE_LABELS[member.role]}
        </span>
      )}

      {editable ? (
        <button
          type="button"
          onClick={() => onRemove(member)}
          disabled={busy}
          aria-label={`Remove ${member.name}`}
          className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      ) : (
        <span className="w-8" aria-hidden="true" />
      )}
    </li>
  );
}
