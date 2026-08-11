"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import SidebarNav from "./SidebarNav";

/** Hamburger + slide-in drawer. Only rendered below the `lg` breakpoint. */
export default function MobileSidebar() {
  const [open, setOpen] = useState(false);

  // A drawer that stays open behind a scrolling page feels broken.
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <div className="relative flex w-72 max-w-[85%] flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
                  D
                </div>
                <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  DevTrack
                </span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
