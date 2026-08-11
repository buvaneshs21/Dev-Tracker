"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface DropdownProps {
  /** Accessible name for the trigger button. */
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
}

/**
 * Trigger + panel with outside-click and Escape dismissal, so every menu in the
 * navbar behaves the same way.
 */
export default function Dropdown({
  label,
  trigger,
  children,
  triggerClassName = "",
  panelClassName = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none ${triggerClassName}`}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-30 mt-2 origin-top-right rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
