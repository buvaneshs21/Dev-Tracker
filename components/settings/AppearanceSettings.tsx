"use client";

import { useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import SettingsSection from "./SettingsSection";
import FormFeedback, { type Feedback } from "./FormFeedback";
import { applyTheme } from "@/lib/theme";
import { THEMES, THEME_LABELS, type ThemeChoice } from "@/lib/types";

const ICONS: Record<ThemeChoice, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const DESCRIPTIONS: Record<ThemeChoice, string> = {
  light: "Always the light theme.",
  dark: "Always the dark theme.",
  system: "Follow your operating system.",
};

export default function AppearanceSettings({
  initialTheme,
}: {
  initialTheme: ThemeChoice;
}) {
  const [theme, setTheme] = useState<ThemeChoice>(initialTheme);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const choose = async (next: ThemeChoice) => {
    const previous = theme;

    // Paint first, persist second: waiting on the network before repainting
    // makes the control feel broken.
    setTheme(next);
    applyTheme(next);
    setFeedback(null);

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });

      if (!res.ok) throw new Error("save failed");

      setFeedback({ tone: "success", message: "Theme saved." });
    } catch {
      // Roll the UI back so it never claims a preference that wasn't stored.
      setTheme(previous);
      applyTheme(previous);
      setFeedback({
        tone: "error",
        message: "Unable to save your theme. Reverted to the previous one.",
      });
    }
  };

  return (
    <SettingsSection
      title="Appearance"
      description="Choose how DevTrack looks on this account."
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Theme</legend>

        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((option) => {
            const Icon = ICONS[option];
            const selected = theme === option;

            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(option)}
                className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900 ${
                  selected
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-500/15"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex w-full items-center justify-between">
                  <Icon
                    className={`h-5 w-5 ${
                      selected
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                    aria-hidden="true"
                  />
                  {selected && (
                    <Check
                      className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {THEME_LABELS[option]}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {DESCRIPTIONS[option]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2">
          <FormFeedback feedback={feedback} />
        </div>
      </fieldset>
    </SettingsSection>
  );
}
