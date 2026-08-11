import { Info, Laptop } from "lucide-react";

import SettingsSection from "./SettingsSection";
import ChangePasswordForm from "./ChangePasswordForm";
import LogoutButton from "@/components/layout/LogoutButton";

export default function SecuritySettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Password"
        description="Change the password you use to sign in."
      >
        <ChangePasswordForm />
      </SettingsSection>

      <SettingsSection
        title="Sessions"
        description="Where you're currently signed in."
      >
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Laptop className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              This device
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Current session
            </p>
          </div>

          <LogoutButton />
        </div>

        {/* Sessions are stateless JWTs with no server-side registry, so there
            is nothing to enumerate or revoke individually. Saying so is more
            useful than a "Sign out other sessions" button that can't work. */}
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Sign-in uses a stateless token, so other devices can&apos;t be listed
            or signed out individually yet. Tokens expire after 7 days.
          </span>
        </div>
      </SettingsSection>
    </div>
  );
}
