"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import SettingsSection from "./SettingsSection";
import FormFeedback, { type Feedback } from "./FormFeedback";
import Toggle from "@/components/ui/Toggle";
import {
  LIVE_NOTIFICATION_PREFERENCES,
  NOTIFICATION_COPY,
  type NotificationPreferences,
} from "@/lib/types";

type Key = keyof NotificationPreferences;

export default function NotificationSettings({
  initial,
}: {
  initial: NotificationPreferences;
}) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState<Key | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const toggle = async (key: Key, next: boolean) => {
    const previous = values[key];

    setValues((current) => ({ ...current, [key]: next }));
    setBusy(key);
    setFeedback(null);

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: { [key]: next } }),
      });

      if (!res.ok) throw new Error("save failed");

      setFeedback({ tone: "success", message: "Preferences saved." });
    } catch {
      setValues((current) => ({ ...current, [key]: previous }));
      setFeedback({ tone: "error", message: "Unable to save that change." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsSection
      title="Notifications"
      description="Choose what DevTrack should tell you about."
    >
      {/* Saying so plainly beats a settings page that silently does nothing. */}
      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          These arrive in the bell in the top bar. Email delivery isn&apos;t
          built yet, and the categories marked below aren&apos;t sent at all
          — those choices are saved for when they are.
        </span>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {(Object.keys(NOTIFICATION_COPY) as Key[]).map((key) => (
          <li
            key={key}
            className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                {NOTIFICATION_COPY[key].title}

                {!LIVE_NOTIFICATION_PREFERENCES.has(key) && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Not sent yet
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {NOTIFICATION_COPY[key].description}
              </p>
            </div>

            <Toggle
              label={NOTIFICATION_COPY[key].title}
              checked={values[key]}
              disabled={busy === key}
              onChange={(next) => toggle(key, next)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <FormFeedback feedback={feedback} />
      </div>
    </SettingsSection>
  );
}
