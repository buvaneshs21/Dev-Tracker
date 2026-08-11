"use client";

import { useState } from "react";
import { AlertCircle, Loader2, TriangleAlert } from "lucide-react";

import Modal from "@/components/ui/Modal";
import type { ProjectWithStats } from "@/lib/types";

interface DeleteProjectDialogProps {
  onClose: () => void;
  project: ProjectWithStats;
  onDeleted: (projectId: string, detachedTasks: number) => void;
}

/* Mounted by the parent only while open, so `deleting` and `error` start clean
 * on every confirmation. */
export default function DeleteProjectDialog({
  onClose,
  project,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskCount = project.stats.total;

  const confirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not delete the project.");
        setDeleting(false);
        return;
      }

      const data: { detachedTasks?: number } = await res.json();
      onDeleted(project.id, data.detachedTasks ?? 0);
      onClose();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      size="sm"
      open
      onClose={onClose}
      title="Delete project?"
      description="This action cannot be undone."
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-4 py-3">
          <TriangleAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {taskCount === 0 ? (
              <>
                <strong>{project.name}</strong> will be permanently removed.
              </>
            ) : (
              <>
                <strong>{project.name}</strong> will be permanently removed.
                Its {taskCount} task{taskCount === 1 ? "" : "s"} will{" "}
                <strong>not</strong> be deleted — they move back to
                &ldquo;No project&rdquo; and stay in your task list.
              </>
            )}
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
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={confirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? "Deleting…" : "Delete Project"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
