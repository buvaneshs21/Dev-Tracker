"use client";

import { useCallback, useEffect, useState } from "react";

import { useSocket } from "./SocketProvider";
import {
  NOTIFICATION_EVENT_CHANNEL,
  type NotificationRealtimeEvent,
} from "@/lib/realtime/events";
import {
  NOTIFICATION_PAGE_SIZE,
  type NotificationDTO,
  type NotificationFeed,
} from "@/lib/types";

/**
 * Slower than the task poller on purpose.
 *
 * A missed notification is a badge that lights up a few seconds late; a missed
 * task change is a list showing the wrong thing. This runs on every page for
 * the whole session, so it's the one worth being frugal about.
 */
const POLL_INTERVAL_MS = 30_000;

export type UseNotifications = NotificationFeed & {
  /** Refetches now — used when the panel is opened. */
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

/**
 * The bell's feed.
 *
 * Seeded from the server render, so the badge is correct on first paint with no
 * mount fetch and no empty flash. From there it's pushed to over the user's own
 * socket room when realtime is available, polled when it isn't, and refetched
 * whenever the panel opens — so the count is right even if both paths missed
 * something.
 */
export function useNotifications(initial: NotificationFeed): UseNotifications {
  const { socket, state } = useSocket();

  const [feed, setFeed] = useState<NotificationFeed>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;

      setFeed((await res.json()) as NotificationFeed);
    } catch {
      // Keep whatever we last had; the next attempt may succeed.
    }
  }, []);

  // --- socket path -------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const onEvent = (event: NotificationRealtimeEvent) => {
      if (event.type !== "NOTIFICATION_CREATED") return;

      setFeed((current) => ({
        // Idempotent, like the task events: an id already present is left
        // alone, so a duplicate delivery can't double the list.
        items: current.items.some((item) => item.id === event.notification.id)
          ? current.items
          : [event.notification, ...current.items].slice(
              0,
              NOTIFICATION_PAGE_SIZE,
            ),
        // The server counted this authoritatively; incrementing locally would
        // drift the moment another tab marks something read.
        unread: event.unread,
      }));
    };

    socket.on(NOTIFICATION_EVENT_CHANNEL, onEvent);

    // Only this listener — the connection is shared with the task hook.
    return () => {
      socket.off(NOTIFICATION_EVENT_CHANNEL, onEvent);
    };
  }, [socket]);

  // --- polling fallback --------------------------------------------------
  useEffect(() => {
    if (state === "connected") return;

    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [state, refresh]);

  /** Optimistic, then reconciled: the server returns the authoritative feed. */
  const patchRead = useCallback(
    async (body: Record<string, unknown>, optimistic: (feed: NotificationFeed) => NotificationFeed) => {
      setFeed(optimistic);

      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) setFeed((await res.json()) as NotificationFeed);
      } catch {
        // The optimistic state stands; the next poll or open will correct it.
      }
    },
    [],
  );

  const markAllRead = useCallback(
    () =>
      patchRead({ all: true }, (current) => ({
        items: current.items.map((item) => ({ ...item, read: true })),
        unread: 0,
      })),
    [patchRead],
  );

  const markRead = useCallback(
    (id: string) =>
      patchRead({ id }, (current) => {
        const target = current.items.find((item) => item.id === id);
        if (!target || target.read) return current;

        return {
          items: current.items.map(
            (item): NotificationDTO =>
              item.id === id ? { ...item, read: true } : item,
          ),
          unread: Math.max(0, current.unread - 1),
        };
      }),
    [patchRead],
  );

  return { ...feed, refresh, markAllRead, markRead };
}
