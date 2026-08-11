"use client";

import { useState } from "react";
import { AlertCircle, Copy, Loader2, Mail } from "lucide-react";

import Modal from "@/components/ui/Modal";
import MemberRoleSelect from "./MemberRoleSelect";
import {
  ROLE_DESCRIPTIONS,
  type InvitableRole,
  type ProjectInvitationDTO,
} from "@/lib/types";

export type InviteResult = {
  invitations: ProjectInvitationDTO[];
  /** Only ever present outside production. */
  devLink: string | null;
};

interface InviteMemberDialogProps {
  onClose: () => void;
  onInvite: (
    email: string,
    role: InvitableRole,
  ) => Promise<{ ok: true; value: InviteResult } | { ok: false; error: string }>;
}

export default function InviteMemberDialog({
  onClose,
  onInvite,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || sending) return;

    setSending(true);
    setError(null);

    const result = await onInvite(email.trim(), role);

    if (!result.ok) {
      setError(result.error);
      setSending(false);
      return;
    }

    setSent(result.value);
    setSending(false);
  };

  const copyLink = async () => {
    if (!sent?.devLink) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}${sent.devLink}`,
    );
    setCopied(true);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite member"
      description="They'll get access to this project and its tasks."
    >
      {sent ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/15 px-4 py-3">
            <Mail
              className="mt-0.5 h-4 w-4 shrink-0 text-green-700 dark:text-green-300"
              aria-hidden="true"
            />
            <p className="text-sm text-green-900 dark:text-green-200">
              Invitation created successfully for <strong>{email}</strong>.
            </p>
          </div>

          {sent.devLink && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                Development link
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Email delivery isn&apos;t configured, so the link is shown here
                for testing. It is never returned in production.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                  {sent.devLink}
                </code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setSent(null);
                setEmail("");
                setCopied(false);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Invite another
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="john@example.com"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</span>
            <MemberRoleSelect
              label="Role for the invited member"
              value={role}
              onChange={setRole}
              className="w-full px-3.5 py-2.5 text-sm"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {ROLE_DESCRIPTIONS[role]}
            </span>
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

          <div className="mt-1 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {sending ? "Inviting…" : "Send Invitation"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
