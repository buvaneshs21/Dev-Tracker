import {
  NOTIFICATION_EVENT_CHANNEL,
  TASK_EVENT_CHANNEL,
  projectRoom,
  userRoom,
  type EmitEnvelope,
  type NotificationRealtimeEvent,
  type TaskRealtimeEvent,
} from "./events";

// Server-only by construction: it reads REALTIME_EMIT_SECRET, which has no
// NEXT_PUBLIC_ prefix and so is undefined in the browser. Imported exclusively
// from route handlers.

/**
 * Forwards an envelope to the Socket.IO server, if one is configured.
 *
 * Deliberately fire-and-forget and never throwing: a task update must succeed
 * whether or not realtime is running. Callers await nothing — the REST response
 * is the source of truth, the socket event is only a notification.
 *
 * With no REALTIME_URL set (local development without the realtime server, or a
 * Vercel-only deployment) this is a no-op and clients fall back to polling.
 */
function emit(envelope: EmitEnvelope): void {
  const url = process.env.REALTIME_URL;
  const secret = process.env.REALTIME_EMIT_SECRET;

  if (!url || !secret) return;

  void fetch(`${url.replace(/\/$/, "")}/emit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Shared secret, server-to-server only. Never reaches the browser.
      "x-emit-secret": secret,
    },
    body: JSON.stringify(envelope),
    // Don't hold the response open on a slow relay.
    signal: AbortSignal.timeout(2000),
  }).catch((err) => {
    // A realtime outage must not surface as a failed task operation.
    console.warn("[realtime] emit failed:", (err as Error).message);
  });
}

/** Task change → everyone currently viewing that project. */
export function emitTaskEvent(event: TaskRealtimeEvent): void {
  const projectId =
    event.type === "TASK_CREATED" || event.type === "TASK_UPDATED"
      ? event.task.projectId
      : event.projectId;

  // A task with no project has no room to broadcast to. Dropping it is correct,
  // not an error.
  if (!projectId) return;

  emit({
    room: projectRoom(projectId),
    channel: TASK_EVENT_CHANNEL,
    payload: event,
  });
}

/** Notification → the one person it belongs to, wherever they're logged in. */
export function emitNotificationEvent(
  recipientId: string,
  event: NotificationRealtimeEvent,
): void {
  emit({
    room: userRoom(recipientId),
    channel: NOTIFICATION_EVENT_CHANNEL,
    payload: event,
  });
}
