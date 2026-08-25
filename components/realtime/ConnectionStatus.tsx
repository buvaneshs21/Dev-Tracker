"use client";

import { useSocket } from "./SocketProvider";
import type { ConnectionState } from "@/lib/realtime/events";

const COPY: Record<ConnectionState, { label: string; dot: string }> = {
  connected: { label: "Live", dot: "bg-green-500" },
  connecting: { label: "Reconnecting…", dot: "bg-amber-500 animate-pulse" },
  offline: { label: "Offline", dot: "bg-slate-400" },
};

/**
 * A quiet indicator, shown only while a socket connection is expected.
 *
 * With no realtime server configured the app polls instead and works perfectly
 * well, so advertising "Offline" there would be alarming and meaningless.
 */
export default function ConnectionStatus() {
  const { state, enabled } = useSocket();

  if (!enabled) return null;

  const { label, dot } = COPY[state];

  return (
    <span
      role="status"
      aria-live="polite"
      title={`Realtime: ${label}`}
      className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 sm:inline-flex dark:text-slate-400"
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
