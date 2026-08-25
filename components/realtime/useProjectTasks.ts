"use client";

import { useCallback, useEffect, useState } from "react";

import { useSocket } from "./SocketProvider";
import {
  TASK_EVENT_CHANNEL,
  type ConnectionState,
  type TaskRealtimeEvent,
} from "@/lib/realtime/events";
import type { TaskDTO } from "@/lib/types";

/** How often to refetch while the socket is unavailable. */
const POLL_INTERVAL_MS = 3000;

/**
 * Applies an event to a task list.
 *
 * Every case is **idempotent** — create upserts, update replaces by id, delete
 * filters. That's what makes the duplicate-event problem disappear: the client
 * that made the change already patched its list from the API response, and
 * re-applying the same event changes nothing. No "ignore my own events"
 * bookkeeping, and no divergence between the actor and the observers.
 *
 * Realtime payloads are partial by design, so updates merge onto the existing
 * task rather than replacing it — otherwise description, subtasks and the rest
 * would be wiped by a status change.
 */
function applyEvent(tasks: TaskDTO[], event: TaskRealtimeEvent): TaskDTO[] {
  switch (event.type) {
    case "TASK_CREATED": {
      if (tasks.some((task) => task.id === event.task.id)) return tasks;
      // A created task arrives partial; the missing fields fill in on the next
      // full load. Defaults keep the row renderable meanwhile.
      return [
        {
          description: "",
          completedAt: null,
          createdAt: event.task.updatedAt,
          ...event.task,
        } as TaskDTO,
        ...tasks,
      ];
    }

    case "TASK_UPDATED":
      return tasks.map((task) =>
        task.id === event.task.id ? { ...task, ...event.task } : task,
      );

    case "TASK_STATUS_CHANGED":
      return tasks.map((task) =>
        task.id === event.taskId
          ? { ...task, status: event.status, updatedAt: event.updatedAt }
          : task,
      );

    case "TASK_DELETED":
      return tasks.filter((task) => task.id !== event.taskId);

    default:
      return tasks;
  }
}

export type UseProjectTasks = {
  tasks: TaskDTO[];
  setTasks: React.Dispatch<React.SetStateAction<TaskDTO[]>>;
  state: ConnectionState;
};

/**
 * Live task list for one project.
 *
 * Joins the project room when a socket is available and patches state from
 * events; falls back to polling whenever it isn't, so the list still updates on
 * a deployment with no realtime server at all.
 */
export function useProjectTasks(
  projectId: string,
  initialTasks: TaskDTO[],
): UseProjectTasks {
  const { socket, state } = useSocket();
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);

  // --- socket path -------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const join = () => socket.emit("project:join", projectId);

    // Join now if already connected, and again after every reconnect —
    // rooms don't survive a dropped connection.
    if (socket.connected) join();
    socket.on("connect", join);

    const onEvent = (event: TaskRealtimeEvent) => {
      // Ignore anything for another project; the room should prevent this, but
      // a stale room membership shouldn't corrupt the list.
      const eventProject =
        event.type === "TASK_CREATED" || event.type === "TASK_UPDATED"
          ? event.task.projectId
          : event.projectId;

      if (eventProject !== projectId) return;

      setTasks((current) => applyEvent(current, event));
    };

    socket.on(TASK_EVENT_CHANNEL, onEvent);

    return () => {
      socket.emit("project:leave", projectId);
      socket.off("connect", join);
      // Remove only this listener — other components share the connection.
      socket.off(TASK_EVENT_CHANNEL, onEvent);
    };
  }, [socket, projectId]);

  // --- polling fallback --------------------------------------------------
  useEffect(() => {
    if (state === "connected") return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`);
        if (!res.ok || cancelled) return;

        const data: { tasks: TaskDTO[] } = await res.json();

        setTasks((current) => {
          // Skip the re-render when nothing actually changed — this runs every
          // few seconds for as long as the socket is down.
          const same =
            current.length === data.tasks.length &&
            current.every(
              (task, index) =>
                task.id === data.tasks[index].id &&
                task.updatedAt === data.tasks[index].updatedAt,
            );

          return same ? current : data.tasks;
        });
      } catch {
        // A failed poll is not worth surfacing; the next one may succeed.
      }
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [state, projectId]);

  const stableSetTasks = useCallback<UseProjectTasks["setTasks"]>(
    (value) => setTasks(value),
    [],
  );

  return { tasks, setTasks: stableSetTasks, state };
}
