"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

import type { ConnectionState } from "@/lib/realtime/events";

type SocketContextValue = {
  /** null until connected, and whenever realtime is unavailable. */
  socket: Socket | null;
  state: ConnectionState;
  /** False when no realtime server is configured — clients then poll. */
  enabled: boolean;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  state: "offline",
  enabled: false,
});

export const useSocket = () => useContext(SocketContext);

/**
 * One connection for the whole app.
 *
 * Mounted once in the authenticated shell, so components never open their own
 * socket. With NEXT_PUBLIC_SOCKET_URL unset this stays dormant and consumers
 * fall back to polling — which is what makes a Vercel-only deployment work.
 */
export default function SocketProvider({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  const enabled = Boolean(url);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ConnectionState>(
    enabled ? "connecting" : "offline",
  );

  // Guards against React 18 StrictMode double-invoking the effect and opening
  // two sockets.
  const created = useRef(false);

  useEffect(() => {
    if (!enabled || created.current) return;
    created.current = true;

    let active = true;
    let instance: Socket | null = null;

    const start = async () => {
      // The token is fetched from our own origin, where the session cookie
      // lives; the socket server never sees the cookie.
      const token = await fetch("/api/realtime/token")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => data?.token as string | undefined)
        .catch(() => undefined);

      if (!active) return;

      if (!token) {
        setState("offline");
        return;
      }

      instance = io(url!, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
      });

      instance.on("connect", () => setState("connected"));
      instance.on("disconnect", () => setState("connecting"));
      instance.io.on("reconnect_attempt", () => setState("connecting"));

      instance.on("connect_error", () => {
        // Auth failures and an unreachable server look the same to the user:
        // realtime is unavailable, so poll.
        setState("offline");
      });

      setSocket(instance);
    };

    void start();

    return () => {
      active = false;
      instance?.removeAllListeners();
      instance?.disconnect();
      created.current = false;
    };
  }, [enabled, url]);

  const value = useMemo(
    () => ({ socket, state, enabled }),
    [socket, state, enabled],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
