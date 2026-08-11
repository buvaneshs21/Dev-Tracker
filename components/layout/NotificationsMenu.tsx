"use client";

import { Bell, BellOff } from "lucide-react";

import Dropdown from "@/components/ui/Dropdown";
import EmptyState from "@/components/ui/EmptyState";

/**
 * There is no notifications backend yet, so this shows an honest empty state
 * rather than a permanent unread dot that never clears.
 */
export default function NotificationsMenu() {
  return (
    <Dropdown
      label="Notifications"
      triggerClassName="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
      panelClassName="w-72 p-2"
      trigger={<Bell className="h-5 w-5" aria-hidden="true" />}
    >
      <div className="px-2 pt-2 pb-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
      </div>

      <EmptyState
        compact
        icon={BellOff}
        title="You're all caught up"
        message="Updates about your tasks will land here."
      />
    </Dropdown>
  );
}
