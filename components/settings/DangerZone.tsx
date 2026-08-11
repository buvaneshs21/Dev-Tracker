"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Trash2 } from "lucide-react";

import SettingsSection from "./SettingsSection";
import DeleteAccountDialog from "./DeleteAccountDialog";
import type { DeletionBlocker } from "@/lib/users";

interface DangerZoneProps {
  email: string;
  /** Owned projects that other people have joined. */
  blockers: DeletionBlocker[];
}

export default function DangerZone({ email, blockers }: DangerZoneProps) {
  const [confirming, setConfirming] = useState(false);
  const blocked = blockers.length > 0;

  return (
    <SettingsSection
      tone="danger"
      title="Delete your account"
      description="Permanently delete your DevTrack account and associated personal data."
    >
      {blocked ? (
        // Deleting would take shared projects down with it, so the action is
        // withheld with a route out rather than silently stranding people.
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/15">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <p>
                You own {blockers.length} project
                {blockers.length === 1 ? "" : "s"} that other people have
                joined. Deleting your account would remove their access too.
              </p>
              <ul className="mt-2 space-y-1">
                {blockers.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium underline underline-offset-2"
                    >
                      {project.name}
                    </Link>{" "}
                    · {project.memberCount} members
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                Remove the other members, or delete those projects, then come
                back.
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-red-600/50 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Account
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete Account
        </button>
      )}

      {confirming && (
        <DeleteAccountDialog
          email={email}
          onClose={() => setConfirming(false)}
        />
      )}
    </SettingsSection>
  );
}
