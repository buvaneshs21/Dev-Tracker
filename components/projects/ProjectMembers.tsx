"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LogOut, Mail, UserPlus } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import MemberList from "./MemberList";
import InviteMemberDialog, { type InviteResult } from "./InviteMemberDialog";
import RemoveMemberDialog from "./RemoveMemberDialog";
import {
  ROLE_LABELS,
  type InvitableRole,
  type ProjectInvitationDTO,
  type ProjectMemberDTO,
  type ProjectRole,
} from "@/lib/types";

interface ProjectMembersProps {
  projectId: string;
  projectName: string;
  currentUserId: string;
  role: ProjectRole;
  canManage: boolean;
  initialMembers: ProjectMemberDTO[];
  initialInvitations: ProjectInvitationDTO[];
}

export default function ProjectMembers({
  projectId,
  projectName,
  currentUserId,
  role,
  canManage,
  initialMembers,
  initialInvitations,
}: ProjectMembersProps) {
  const router = useRouter();

  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<ProjectMemberDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Reads the API's error message, falling back to something readable. */
  const readError = async (res: Response, fallback: string) => {
    const data = await res.json().catch(() => ({}));
    return typeof data.error === "string" ? data.error : fallback;
  };

  const invite = async (email: string, inviteRole: InvitableRole) => {
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: inviteRole }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        error: await readError(res, "Could not send the invitation."),
      };
    }

    const data: InviteResult = await res.json();
    setInvitations(data.invitations);
    router.refresh();

    return { ok: true as const, value: data };
  };

  const changeRole = async (
    member: ProjectMemberDTO,
    nextRole: InvitableRole,
  ) => {
    setBusyId(member.id);
    setError(null);

    const res = await fetch(
      `/api/projects/${projectId}/members/${member.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      },
    );

    if (!res.ok) {
      setError(await readError(res, "Could not update that role."));
      setBusyId(null);
      return;
    }

    const data: { members: ProjectMemberDTO[] } = await res.json();
    setMembers(data.members);
    setBusyId(null);
    router.refresh();
  };

  const confirmRemove = async (): Promise<string | null> => {
    if (!removing) return null;

    const res = await fetch(
      `/api/projects/${projectId}/members/${removing.id}`,
      { method: "DELETE" },
    );

    if (!res.ok) return readError(res, "Could not remove that member.");

    const data: { members: ProjectMemberDTO[] } = await res.json();
    setMembers(data.members);
    router.refresh();

    return null;
  };

  const leave = async () => {
    setLeaving(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/members/leave`, {
      method: "POST",
    });

    if (!res.ok) {
      setError(await readError(res, "Could not leave the project."));
      setLeaving(false);
      return;
    }

    router.replace("/projects");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <SectionHeader
          title="Members"
          subtitle={`${members.length} ${members.length === 1 ? "person has" : "people have"} access · you're ${ROLE_LABELS[role].toLowerCase()}`}
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => setInviting(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Invite Member
              </button>
            ) : undefined
          }
        />

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4">
          <MemberList
            members={members}
            canManage={canManage}
            currentUserId={currentUserId}
            busyId={busyId}
            onRoleChange={changeRole}
            onRemove={setRemoving}
          />
        </div>
      </Card>

      {canManage && invitations.length > 0 && (
        <Card className="p-6">
          <SectionHeader
            title="Pending invitations"
            subtitle="Waiting to be accepted"
          />

          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center gap-3 py-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {invitation.email}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Invited as {ROLE_LABELS[invitation.role].toLowerCase()} ·
                    expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 dark:bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-500/30 ring-inset">
                  Pending
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* The owner has nowhere to hand the project to, so leaving is theirs to
          do only after an ownership transfer — which V1 doesn't have. */}
      {role !== "owner" && (
        <Card className="p-6">
          <SectionHeader
            title="Leave project"
            subtitle="You'll lose access to this project and its tasks."
            action={
              <button
                type="button"
                onClick={leave}
                disabled={leaving}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {leaving ? "Leaving…" : "Leave Project"}
              </button>
            }
          />
        </Card>
      )}

      {inviting && (
        <InviteMemberDialog
          onClose={() => setInviting(false)}
          onInvite={invite}
        />
      )}

      {removing && (
        <RemoveMemberDialog
          member={removing}
          projectName={projectName}
          onClose={() => setRemoving(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}
