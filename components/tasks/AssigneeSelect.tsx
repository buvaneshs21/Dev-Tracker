"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import type { ProjectMemberDTO } from "@/lib/types";

interface AssigneeSelectProps {
  value: string;
  members: ProjectMemberDTO[];
  /** The current assignee's name, for the read-only and fallback cases. */
  currentName: string;
  disabled?: boolean;
  onAssign: (userId: string) => Promise<void>;
}

/**
 * Hands a task to another member of its project.
 *
 * Falls back to plain text — not a disabled control — whenever there's nobody
 * to choose from: a personal task, or a project of one. An empty dropdown
 * invites a click that can't go anywhere.
 */
export default function AssigneeSelect({
  value,
  members,
  currentName,
  disabled = false,
  onAssign,
}: AssigneeSelectProps) {
  const [saving, setSaving] = useState(false);

  const plain = (
    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
      {currentName}
    </span>
  );

  if (disabled || members.length < 2) return plain;

  // The assignee may not be in the list — someone can be assigned a task and
  // then removed from the project. Keeping their name as an option stops the
  // select from silently jumping to a different person.
  const known = members.some((member) => member.userId === value);

  const change = async (next: string) => {
    if (next === value) return;

    setSaving(true);
    try {
      await onAssign(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={saving}
        aria-label="Assignee"
        onChange={(event) => void change(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        {!known && <option value={value}>{currentName}</option>}

        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>

      {saving && (
        <Loader2
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin text-slate-400"
        />
      )}
    </div>
  );
}
