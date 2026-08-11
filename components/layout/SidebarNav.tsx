"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "./nav-items";

const baseItem =
  "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200";

/** Shared by the desktop sidebar and the mobile drawer so both stay in step. */
export default function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;

        if (!item.available) {
          return (
            <div
              key={item.title}
              aria-disabled="true"
              className={`${baseItem} cursor-not-allowed text-slate-400 dark:text-slate-500 select-none`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.title}</span>
              <span className="ml-auto rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
                Soon
              </span>
            </div>
          );
        }

        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.title}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`${baseItem} focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
              active
                ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600"
              />
            )}

            <Icon
              size={18}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:scale-110"
            />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
