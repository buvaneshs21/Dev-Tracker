"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { SETTINGS_NAV } from "./settings-nav-items";

/**
 * A list on desktop; a native select below `lg`.
 *
 * A select rather than a horizontal tab strip because seven items would either
 * overflow sideways or wrap into an unreadable pile on a phone.
 */
export default function SettingsNav() {
  const pathname = usePathname();
  const router = useRouter();

  const current =
    SETTINGS_NAV.find((item) => pathname.startsWith(item.href))?.href ??
    SETTINGS_NAV[0].href;

  return (
    <>
      <div className="lg:hidden">
        <label htmlFor="settings-section" className="sr-only">
          Settings section
        </label>
        <select
          id="settings-section"
          value={current}
          onChange={(event) => router.push(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          {SETTINGS_NAV.map((item) => (
            <option key={item.href} value={item.href}>
              {item.title}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Settings" className="hidden lg:block">
        <ul className="space-y-1">
          {SETTINGS_NAV.map((item, index) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            const previous = SETTINGS_NAV[index - 1];
            const startsDangerGroup = item.danger && !previous?.danger;

            return (
              <li
                key={item.href}
                className={
                  startsDangerGroup
                    ? "mt-4 border-t border-slate-200 pt-4 dark:border-slate-800"
                    : undefined
                }
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-950 ${
                    active
                      ? item.danger
                        ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                      : item.danger
                        ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  <Icon
                    size={18}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
