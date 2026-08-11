"use client";

import { useState } from "react";
import { AlertCircle, Loader2, TriangleAlert } from "lucide-react";

import Modal from "@/components/ui/Modal";
import type { ProjectMemberDTO } from "@/lib/types";

interface RemoveMemberDialogProps {
  member: ProjectMemberDTO;
  projectName: string;
  onClose: () => void;
  onConfirm: () => Promise<string | null>;
}

/** Mounted only while open, so state starts clean on every confirmation. */
export default function RemoveMemberDialog({
  member,
  projectName,
  onClose,
  onConfirm,
}: RemoveMemberDialogProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setRemoving(true);
    setError(null);

    const message = await onConfirm();

    if (message) {
      setError(message);
      setRemoving(false);
      return;
    }

    onClose();
  };

  const firstName = member.name.split(" ")[0] || member.name;

  return (
    <Modal
      size="sm"
      open
      onClose={onClose}
      title={`Remove ${firstName} from ${projectName}?`}
      description="This only removes their access to this project."
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-4 py-3">
          <TriangleAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>{member.name}</strong> will lose access to this project and
            its tasks. Their account and their own tasks are not affected.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={confirm}
            disabled={removing}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {removing && <Loader2 className="h-4 w-4 animate-spin" />}
            {removing ? "Removing…" : "Remove Member"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
