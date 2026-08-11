"use client";

import { INVITABLE_ROLES, ROLE_LABELS, type InvitableRole } from "@/lib/types";

interface MemberRoleSelectProps {
  value: InvitableRole;
  onChange: (role: InvitableRole) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}

/**
 * Only ever offers admin/member/viewer — owner isn't assignable, it follows
 * Project.ownerId.
 */
export default function MemberRoleSelect({
  value,
  onChange,
  disabled = false,
  label,
  className = "",
}: MemberRoleSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as InvitableRole)}
      className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {INVITABLE_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}
