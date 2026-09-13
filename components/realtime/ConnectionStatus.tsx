"use client";

import { RefreshCw } from "lucide-react";

import { useSocket } from "./SocketProvider";
import type { ConnectionState } from "@/lib/realtime/events";

type Copy = { label: string; dot: string; title: string; spin?: boolean };

/**
 * Four honest states.
 *
 * The one that needed care is `offline`. The app is not broken there — every
 * live view falls back to polling — so labelling it "Offline" in red reads as
 * a failure of something that is still working. But calling it "Live" would
 * claim a WebSocket that does not exist. "Syncing" is the accurate middle:
 * data is still arriving, just on a timer, and the tooltip says so.
 */
const COPY: Record<ConnectionState, Copy> = {
  connected: {
    label: "Live",
    dot: "bg-green-500",
    title: "Live updates are on — changes appear immediately",
  },
  connecting: {
    label: "Connecting…",
    dot: "bg-amber-500 animate-pulse",
    title: "Opening a live connection",
  },
  reconnecting: {
    label: "Reconnecting…",
    dot: "bg-amber-500 animate-pulse",
    title: "The live connection dropped — retrying",
  },
  offline: {
    label: "Syncing",
    dot: "bg-slate-400",
    title: "Live updates unavailable — refreshing periodically instead",
    spin: true,
  },
};

/**
 * A quiet indicator, shown only while a socket connection is expected.
 *
 * With no realtime server configured the app polls and works perfectly well,
 * so advertising anything there would be noise about a system the deployment
 * never opted into.
 */
export default function ConnectionStatus() {
  const { state, enabled } = useSocket();

  if (!enabled) return null;

  const { label, dot, title, spin } = COPY[state];

  return (
    <span
      role="status"
      aria-live="polite"
      title={title}
      className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 sm:inline-flex dark:text-slate-400"
    >
      {spin ? (
        <RefreshCw
          aria-hidden="true"
          className="h-3 w-3 animate-[spin_3s_linear_infinite] text-slate-400"
        />
      ) : (
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      )}
      {label}
    </span>
  );
}
