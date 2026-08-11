import Link from "next/link";

import SidebarNav from "./SidebarNav";

/** Desktop rail. Below `lg` the same nav is reached through MobileSidebar. */
export default function Sidebar() {
  return (
    // sticky rather than fixed: it stays a flex child, so the main column
    // needs no left offset, and the page keeps a single scroll context.
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-8 lg:flex">
      <Link
        href="/dashboard"
        className="mb-10 flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
          D
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          DevTrack
        </span>
      </Link>

      <SidebarNav />

      <div className="mt-auto rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Stay on track</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Give tasks a due date and they&apos;ll roll up into your weekly goal.
        </p>
      </div>
    </aside>
  );
}
