"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
  XCircle,
} from "lucide-react";

import { colorClassesFor } from "./project-colors";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type InvitationPreview } from "@/lib/types";

interface InvitationCardProps {
  token: string;
  preview: InvitationPreview;
  /** Null when nobody is signed in. */
  currentEmail: string | null;
}

export default function InvitationCard({
  token,
  preview,
  currentEmail,
}: InvitationCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const signedIn = currentEmail !== null;
  const emailMatches =
    signedIn && currentEmail.toLowerCase() === preview.email.toLowerCase();

  const act = async (action: "accept" | "decline") => {
    setBusy(action);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${token}/${action}`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please try again.",
        );
        setBusy(null);
        return;
      }

      if (action === "accept") {
        router.replace(`/projects/${data.projectId}`);
        router.refresh();
      } else {
        setDeclined(true);
        setBusy(null);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
      setBusy(null);
    }
  };

  const colors = colorClassesFor(preview.projectColor);

  if (declined || preview.status === "declined") {
    return (
      <Notice
        icon={<XCircle className="h-6 w-6 text-slate-400 dark:text-slate-500" />}
        title="Invitation declined"
        message="You've declined this invitation. Ask for a new one if you change your mind."
      />
    );
  }

  if (preview.status === "accepted") {
    return (
      <Notice
        icon={<CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />}
        title="Invitation already accepted"
        message={`You're already a member of ${preview.projectName}.`}
        action={
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
          >
            Go to projects
          </Link>
        }
      />
    );
  }

  if (preview.status === "expired") {
    return (
      <Notice
        icon={<Clock3 className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
        title="This invitation has expired"
        message={`Ask ${preview.invitedByName} to send you a new one.`}
      />
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`h-3.5 w-3.5 rounded-full ${colors.dot}`}
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">You&apos;re invited to join</p>
      </div>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {preview.projectName}
      </h1>

      <dl className="mt-6 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Invited by</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {preview.invitedByName}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Sent to</dt>
          <dd className="truncate font-medium text-slate-900 dark:text-slate-100">
            {preview.email}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Role</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {ROLE_LABELS[preview.role]}
          </dd>
        </div>
      </dl>

      <p className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">
        {ROLE_DESCRIPTIONS[preview.role]}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!signedIn ? (
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in to accept
          </Link>
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Sign in as <strong>{preview.email}</strong> to join this project.
          </p>
        </div>
      ) : !emailMatches ? (
        // The invite is addressed to an email — holding the link isn't enough.
        <div className="mt-6 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          This invitation was sent to <strong>{preview.email}</strong>, but
          you&apos;re signed in as <strong>{currentEmail}</strong>. Sign in with
          the invited account to accept it.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => act("accept")}
            disabled={busy !== null}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "accept" && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy === "accept" ? "Joining…" : "Accept Invitation"}
          </button>

          <button
            type="button"
            onClick={() => act("decline")}
            disabled={busy !== null}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            {busy === "decline" && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy === "decline" ? "Declining…" : "Decline"}
          </button>
        </div>
      )}
    </div>
  );
}

function Notice({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        {icon}
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
