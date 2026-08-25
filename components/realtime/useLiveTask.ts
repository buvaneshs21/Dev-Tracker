"use client";

import { useCallback, useEffect, useState } from "react";

import { useSocket } from "./SocketProvider";
import {
  TASK_EVENT_CHANNEL,
  type TaskRealtimeEvent,
} from "@/lib/realtime/events";
import type { TaskDTO } from "@/lib/types";

/**
 * Slower than the task list's poller.
 *
 * One person reading one task changes far less often than a shared board, and
 * this refetches a whole task rather than a summary row.
 */
const POLL_INTERVAL_MS = 5000;

export type UseLiveTask = {
  task: TaskDTO;
  /** Local edits still write here; incoming events merge on top idempotently. */
  setTask: React.Dispatch<React.SetStateAction<TaskDTO>>;
  /**
   * True once the task is gone — deleted by someone else, or access revoked.
   * The two are deliberately indistinguishable from the client's side.
   */
  gone: boolean;
};

/**
 * Keeps one task's fields live while its detail page is open.
 *
 * Covers what the socket carries — title, status, priority, dates and the
 * assignment. Subtasks, updates, attachments and links are *not* included:
 * they have their own routes and no events, so they still need a reload.
 *
 * A task with no project has no room to listen on, so it relies on polling.
 */
export function useLiveTask(initial: TaskDTO): UseLiveTask {
  const { socket, state } = useSocket();

  const [task, setTask] = useState<TaskDTO>(initial);
  const [gone, setGone] = useState(false);

  const { id, projectId } = task;

  // --- socket path -------------------------------------------------------
  useEffect(() => {
    if (!socket || !projectId) return;

    const join = () => socket.emit("project:join", projectId);

    // Rooms don't survive a dropped connection, so rejoin on every connect.
    if (socket.connected) join();
    socket.on("connect", join);

    const onEvent = (event: TaskRealtimeEvent) => {
      switch (event.type) {
        case "TASK_UPDATED":
          if (event.task.id !== id) return;
          // Merged, not replaced: realtime payloads are partial by design, so
          // replacing would wipe the description.
          setTask((current) => ({ ...current, ...event.task }));
          return;

        case "TASK_STATUS_CHANGED":
          if (event.taskId !== id) return;
          setTask((current) => ({
            ...current,
            status: event.status,
            updatedAt: event.updatedAt,
          }));
          return;

        case "TASK_DELETED":
          // A move between projects emits DELETE against the *old* room. That
          // isn't a deletion, so only treat it as one when the task still
          // believes it lives there.
          if (event.taskId === id && event.projectId === projectId) {
            setGone(true);
          }
          return;

        default:
          return;
      }
    };

    socket.on(TASK_EVENT_CHANNEL, onEvent);

    return () => {
      socket.emit("project:leave", projectId);
      socket.off("connect", join);
      // Only this listener — the connection is shared.
      socket.off(TASK_EVENT_CHANNEL, onEvent);
    };
  }, [socket, projectId, id]);

  // --- polling fallback --------------------------------------------------
  useEffect(() => {
    // A project room can push; without one, polling is the only route.
    if (state === "connected" && projectId) return;
    if (gone) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tasks/${id}`);
        if (cancelled) return;

        if (res.status === 404) {
          setGone(true);
          return;
        }

        if (!res.ok) return;

        const fresh: TaskDTO = await res.json();

        setTask((current) =>
          // Skip the re-render when nothing moved — this runs for as long as
          // the page is open.
          current.updatedAt === fresh.updatedAt ? current : fresh,
        );
      } catch {
        // A failed poll isn't worth surfacing; the next one may succeed.
      }
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [state, projectId, id, gone]);

  const stableSetTask = useCallback<UseLiveTask["setTask"]>(
    (value) => setTask(value),
    [],
  );

  return { task, setTask: stableSetTask, gone };
}
