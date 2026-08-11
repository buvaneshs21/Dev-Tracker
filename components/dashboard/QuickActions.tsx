import Link from "next/link";
import { FolderPlus, Plus, UserPlus, type LucideIcon } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";

type Action = {
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  color: string;
  tint: string;
};

const ACTIONS: Action[] = [
  {
    label: "New Task",
    description: "Capture something to do",
    icon: Plus,
    href: "/tasks?new=1",
    color: "text-indigo-600 dark:text-indigo-400",
    tint: "bg-indigo-50 dark:bg-indigo-500/15",
  },
  {
    label: "New Project",
    description: "Group related work",
    icon: FolderPlus,
    href: "/projects",
    color: "text-violet-600 dark:text-violet-400",
    tint: "bg-violet-50 dark:bg-violet-500/15",
  },
  // No members backend yet — shown so the shape of the product is legible, but
  // not clickable, so nothing leads to a dead route.
  {
    label: "Invite Member",
    description: "Share your workspace",
    icon: UserPlus,
    color: "text-slate-400 dark:text-slate-500",
    tint: "bg-slate-100 dark:bg-slate-800",
  },
];

export default function QuickActions() {
  return (
    <Card className="p-6">
      <SectionHeader title="Quick actions" />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;

          const body = (
            <>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.tint} ${action.color}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {action.label}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {action.description}
                </span>
              </span>
            </>
          );

          if (!action.href) {
            return (
              <div
                key={action.label}
                aria-disabled="true"
                title="Coming soon"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 opacity-60"
              >
                {body}
              </div>
            );
          }

          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {body}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
