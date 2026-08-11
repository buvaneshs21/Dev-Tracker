"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";

import Modal from "@/components/ui/Modal";
import FormFeedback, { type Feedback } from "./FormFeedback";
import { secondaryButton, settingsInput, settingsLabel } from "./field-styles";

interface DeleteAccountDialogProps {
  email: string;
  onClose: () => void;
}

/** Mounted only while open, so the typed confirmation never persists. */
export default function DeleteAccountDialog({
  email,
  onClose,
}: DeleteAccountDialogProps) {
  const router = useRouter();

  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  const confirm = async () => {
    if (!matches || deleting) return;

    setDeleting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: typed.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFeedback({
          tone: "error",
          message:
            typeof data.error === "string"
              ? data.error
              : "Unable to delete your account.",
        });
        setDeleting(false);
        return;
      }

      // The server already cleared the auth cookie; the account no longer
      // exists, so there is nowhere to go but out.
      router.replace("/login");
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        message: "Network error. Check your connection and try again.",
      });
      setDeleting(false);
    }
  };

  return (
    <Modal
      size="sm"
      open
      onClose={onClose}
      title="Delete your account?"
      description="This action cannot be undone."
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/15">
          <TriangleAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
          <div className="text-sm text-red-800 dark:text-red-200">
            <p>This permanently deletes:</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-4">
              <li>your tasks</li>
              <li>projects you own, and their memberships</li>
              <li>your membership of other people&apos;s projects</li>
              <li>invitations you sent</li>
              <li>your preferences and account</li>
            </ul>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={settingsLabel}>
            Type <strong>{email}</strong> to confirm
          </span>
          <input
            autoFocus
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={email}
            autoComplete="off"
            className={settingsInput}
          />
        </label>

        <FormFeedback feedback={feedback} />

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>

          <button
            type="button"
            onClick={confirm}
            disabled={!matches || deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? "Deleting…" : "Permanently Delete Account"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
