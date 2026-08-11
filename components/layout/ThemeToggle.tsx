"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { applyTheme } from "@/lib/theme";
import { THEME_LABELS, isTheme, type ThemeChoice } from "@/lib/types";

const ORDER: ThemeChoice[] = ["light", "dark", "system"];
const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/**
 * The <html data-theme-choice> attribute is the source of truth — the inline
 * script sets it before paint, and applyTheme updates it. Subscribing to it
 * rather than mirroring it into component state means there's only one copy,
 * and the toggle stays in step with the Appearance page automatically.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme-choice"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): ThemeChoice {
  const current = document.documentElement.dataset.themeChoice;
  return isTheme(current) ? current : "system";
}

/** The server can't read the DOM; "system" matches the layout's own default. */
const getServerSnapshot = (): ThemeChoice => "system";

export default function ThemeToggle() {
  const choice = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const cycle = async () => {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    applyTheme(next);

    // Best-effort: the DOM already reflects the change, and the Appearance
    // page is where save failures are surfaced.
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  };

  const Icon = ICONS[choice];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${THEME_LABELS[choice]}. Click to change.`}
      title={`Theme: ${THEME_LABELS[choice]}`}
      className="rounded-lg p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
