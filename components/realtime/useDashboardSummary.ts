"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSocket } from "./SocketProvider";
import {
  PERSONAL_TASK_CHANNEL,
  type TaskRealtimeEvent,
} from "@/lib/realtime/events";
import type { DashboardSummary } from "@/lib/dashboard";

/**
 * How long to wait after an event before refetching.
 *
 * Completing a task emits TASK_UPDATED and TASK_STATUS_CHANGED together, and a
 * reassignment can arrive alongside both. Coalescing them into one request
 * keeps a single user action to a single refetch.
 */
const COALESCE_MS = 250;

/**
 * The dashboard's fallback poll, deliberately slower than the task list's 3s.
 *
 * A dashboard is a glance, not a working surface, and this refetch is three
 * queries rather than one. Thirty seconds matches the notification bell.
 */
const POLL_INTERVAL_MS = 30_000;

/**
 * Keeps the dashboard's counters and upcoming list current.
 *
 * Events arrive on the user's own room — the dashboard is user-scoped, and the
 * existing task rooms are project-scoped, so a project room would carry every
 * member's work and would carry nothing for a task with no project.
 *
 * An event is treated as a *signal*, not a delta: it triggers a refetch rather
 * than patching numbers in place. That is what makes it impossible to drift —
 * see getDashboardSummary for why deltas would.
 */
export function useDashboardSummary(
  initial: DashboardSummary,
): DashboardSummary {
  const { socket, state } = useSocket();
  const [summary, setSummary] = useState<DashboardSummary>(initial);

  // Held in a ref so the socket effect doesn't re-subscribe on every refetch.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) return;

      setSummary((await res.json()) as DashboardSummary);
    } catch {
      // Keep what we last had; the next event or poll will correct it.
    }
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void refresh(), COALESCE_MS);
  }, [refresh]);

  // --- socket path -------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    // No join call: the relay puts every socket in its own user room on
    // connect, from the id inside the verified token. There is nothing for a
    // client to ask for and so nothing to get wrong.
    const onEvent = (event: TaskRealtimeEvent) => {
      // Every task event that reaches this channel is by definition about a
      // task that is or was the viewer's, so all four types matter — a
      // deletion or a hand-off changes the counts as surely as a creation.
      if (!event?.type) return;
      schedule();
    };

    socket.on(PERSONAL_TASK_CHANNEL, onEvent);

    return () => {
      // Only this listener — the connection is shared with the task hooks and
      // the notification bell.
      socket.off(PERSONAL_TASK_CHANNEL, onEvent);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [socket, schedule]);

  // --- polling fallback --------------------------------------------------
  useEffect(() => {
    if (state === "connected") return;

    const poll = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [state, refresh]);

  // A reconnect may have missed events while the socket was down, so catch up
  // once on the way back rather than waiting for the next change.
  const wasConnected = useRef(state === "connected");

  useEffect(() => {
    const connected = state === "connected";

    if (connected && !wasConnected.current) void refresh();
    wasConnected.current = connected;
  }, [state, refresh]);

  return summary;
}
