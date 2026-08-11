import { CalendarDays, CircleCheck, Info, Mail } from "lucide-react";

import SettingsSection from "./SettingsSection";
import LogoutButton from "@/components/layout/LogoutButton";
import type { UserProfileDTO } from "@/lib/types";

/** Presentational — no internal identifiers are passed in, let alone rendered. */
export default function AccountSettings({
  profile,
}: {
  profile: UserProfileDTO;
}) {
  const rows = [
    { icon: Mail, label: "Email", value: profile.email },
    {
      icon: CalendarDays,
      label: "Member since",
      value: new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    },
    { icon: CircleCheck, label: "Status", value: "Active" },
  ];

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Account"
        description="Your account details on DevTrack."
      >
        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => {
            const Icon = row.icon;

            return (
              <div
                key={row.label}
                className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <div className="min-w-0">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {row.value}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>

        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Email changes require verification and will be available in a future
            version.
          </span>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Session"
        description="You're signed in on this device."
      >
        {/* Reuses the same logout used by the navbar — one implementation. */}
        <LogoutButton />
      </SettingsSection>
    </div>
  );
}
