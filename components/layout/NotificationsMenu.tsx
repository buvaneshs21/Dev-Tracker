"use client";

import Link from "next/link";
import {
  Bell,
  BellOff,
  CheckCircle2,
  UserPlus,
  UserRoundCheck,
} from "lucide-react";

import Dropdown from "@/components/ui/Dropdown";
import EmptyState from "@/components/ui/EmptyState";
import { useNotifications } from "@/components/realtime/useNotifications";
import type {
  NotificationDTO,
  NotificationFeed,
  NotificationType,
} from "@/lib/types";

const ICONS: Record<NotificationType, typeof Bell> = {
  TASK_ASSIGNED: UserRoundCheck,
  TASK_COMPLETED: CheckCircle2,
  MEMBER_JOINED: UserPlus,
};

/** "just now", "4m", "3h", "2d" — compact enough for a 288px panel. */
function shortAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d`;

  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

/** Where clicking a notification should land, or null if there's nowhere. */
function hrefFor(item: NotificationDTO): string | null {
  if (item.taskId) return `/tasks/${item.taskId}`;
  if (item.projectId) return `/projects/${item.projectId}`;
  return null;
}

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationDTO;
  onRead: (id: string) => void;
}) {
  const Icon = ICONS[item.type] ?? Bell;
  const href = hrefFor(item);

  const body = (
    <>
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          item.read
            ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {item.title}
        </span>

        {item.body && (
          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
            {item.body}
          </span>
        )}

        <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
          {shortAgo(item.createdAt)}
        </span>
      </span>

      {!item.read && (
        <span
          aria-hidden="true"
          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"
        />
      )}
    </>
  );

  const className =
    "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60";

  // A notification whose target is gone is still worth reading — it just isn't
  // a link any more.
  if (!href) {
    return (
      <div className={className}>
        {body}
      </div>
    );
  }

  return (
    <Link href={href} onClick={() => onRead(item.id)} className={className}>
      {body}
    </Link>
  );
}

/**
 * The bell.
 *
 * Pushed to over the socket when realtime is running, polled otherwise, and
 * always refetched on open — so the count is correct even on a deployment with
 * no socket server at all.
 */
export default function NotificationsMenu({
  initial,
}: {
  initial: NotificationFeed;
}) {
  const { items, unread, refresh, markAllRead, markRead } =
    useNotifications(initial);

  return (
    <Dropdown
      label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      triggerClassName="relative rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
      panelClassName="w-80 p-2"
      // The push and poll paths can both miss things; opening is the moment
      // being right actually matters.
      onOpenChange={(open) => {
        if (open) void refresh();
      }}
      trigger={
        <>
          <Bell className="h-5 w-5" aria-hidden="true" />

          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </>
      }
    >
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Notifications
        </p>

        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="rounded-md px-1.5 py-0.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
          >
            Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          compact
          icon={BellOff}
          title="You're all caught up"
          message="Updates about your tasks will land here."
        />
      ) : (
        <div className="max-h-96 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onRead={(id) => void markRead(id)}
            />
          ))}
        </div>
      )}
    </Dropdown>
  );
}
