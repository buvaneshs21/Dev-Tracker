"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";

import SettingsSection from "./SettingsSection";
import FormFeedback, { type Feedback } from "./FormFeedback";
import Toggle from "@/components/ui/Toggle";
import { settingsInput, settingsLabel } from "./field-styles";
import {
  WEEK_STARTS,
  WEEK_START_LABELS,
  type UserPreferencesDTO,
  type WeekStart,
} from "@/lib/types";

export default function PreferencesSettings({
  initial,
}: {
  initial: UserPreferencesDTO;
}) {
  const router = useRouter();

  const [weekStartsOn, setWeekStartsOn] = useState(initial.weekStartsOn);
  const [compactMode, setCompactMode] = useState(initial.compactMode);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const save = async (patch: Partial<UserPreferencesDTO>, rollback: () => void) => {
    setFeedback(null);

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) throw new Error("save failed");

      setFeedback({ tone: "success", message: "Preferences saved." });
      // Both settings change server-rendered output, so re-render the tree.
      router.refresh();
    } catch {
      rollback();
      setFeedback({ tone: "error", message: "Unable to save that change." });
    }
  };

  const changeWeekStart = (next: WeekStart) => {
    const previous = weekStartsOn;
    setWeekStartsOn(next);
    save({ weekStartsOn: next }, () => setWeekStartsOn(previous));
  };

  const changeCompact = (next: boolean) => {
    const previous = compactMode;
    setCompactMode(next);

    // Apply immediately — the attribute drives the CSS, same as the theme.
    document.documentElement.dataset.compact = next ? "true" : "";
    if (!next) delete document.documentElement.dataset.compact;

    save({ compactMode: next }, () => {
      setCompactMode(previous);
      if (previous) document.documentElement.dataset.compact = "true";
      else delete document.documentElement.dataset.compact;
    });
  };

  return (
    <SettingsSection
      title="Preferences"
      description="Small choices about how the app behaves."
    >
      <div className="flex flex-col gap-6">
        <label className="flex max-w-xs flex-col gap-1.5">
          <span className={settingsLabel}>Start week on</span>
          <select
            value={weekStartsOn}
            onChange={(event) =>
              changeWeekStart(event.target.value as WeekStart)
            }
            className={settingsInput}
          >
            {WEEK_STARTS.map((option) => (
              <option key={option} value={option}>
                {WEEK_START_LABELS[option]}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Sets the first column of the calendar month grid.
          </span>
        </label>

        <div className="flex items-start justify-between gap-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Compact mode
            </p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Tightens padding so more fits on screen.
            </p>
          </div>

          <Toggle
            label="Compact mode"
            checked={compactMode}
            onChange={changeCompact}
          />
        </div>

        {/* Two preferences from the brief are deliberately absent rather than
            shipped as controls that change nothing. */}
        <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Default task view and default calendar view will appear here once
            board and week views exist — there&apos;s only one of each today, so
            the setting would have nothing to switch between.
          </span>
        </div>

        <FormFeedback feedback={feedback} />
      </div>
    </SettingsSection>
  );
}
