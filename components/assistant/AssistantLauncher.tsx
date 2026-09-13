"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import AssistantPanel from "./AssistantPanel";

/**
 * The navbar entry point and the slide-over it opens.
 *
 * Renders nothing at all when the server has no GEMINI_API_KEY — a button
 * that can only ever produce "not configured" is worse than no button. The
 * flag is a boolean computed server-side; the key itself never leaves it.
 */
export default function AssistantLauncher({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask about your work"
        title="Ask about your work"
        className="rounded-lg p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] dark:bg-slate-950/50"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Assistant"
            className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-slate-200 shadow-2xl dark:border-slate-800"
          >
            {/* Remounted on each open, so every session starts clean rather
                than resuming a conversation from an hour ago. */}
            <AssistantPanel onClose={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
