import Link from "next/link";
import { MailX } from "lucide-react";

import InvitationCard from "@/components/projects/InvitationCard";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import { getInvitationByToken } from "@/lib/invitations";

export const metadata = { title: "Invitation" };

/**
 * Deliberately outside the protected routes: someone following an invite link
 * may not have signed in yet. Accepting still requires a session — that check
 * lives in the API, not here.
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  await connectDB();

  const [loaded, session] = await Promise.all([
    getInvitationByToken(token),
    getSession(),
  ]);

  const account = session
    ? await User.findById(session.userId)
        .select("email")
        .lean<{ email?: string } | null>()
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
          D
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          DevTrack
        </span>
      </Link>

      {!loaded ? (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <MailX className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Invitation not found
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This link is invalid, or the project it pointed to no longer exists.
          </p>
        </div>
      ) : (
        <InvitationCard
          token={token}
          preview={loaded.preview}
          currentEmail={account?.email ?? null}
        />
      )}
    </main>
  );
}
