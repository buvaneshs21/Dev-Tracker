import { ReactNode } from "react";
import { redirect } from "next/navigation";

import AppLayout from "@/components/layout/AppLayout";
import SettingsNav from "@/components/settings/SettingsNav";

import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { getUserProfile } from "@/lib/users";

export const metadata = { title: "Settings" };

/**
 * Shared shell for every settings section. Authorises once here rather than in
 * each child page, and each child still re-reads the session for its own data.
 */
export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const profile = await getUserProfile(session.userId);
  if (!profile) redirect("/login");

  return (
    <AppLayout
      title="Settings"
      user={{ name: profile.name || "there", email: profile.email }}
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
            Settings
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Manage your account and application preferences.
          </p>
        </div>

        {/* Fixed nav column on desktop; the nav collapses to a select below lg,
            so this becomes a single stacked column with no sideways overflow. */}
        <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
          <SettingsNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </AppLayout>
  );
}
