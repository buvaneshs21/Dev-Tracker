import type { NotificationDTO, TaskDTO, TaskStatus } from "@/lib/types";

/**
 * The realtime contract, shared by the Next app, the Socket.IO server and the
 * browser. Deliberately free of server imports so client components can use it.
 */

/** Task events are scoped to a project room and never broadcast globally. */
export function projectRoom(projectId: string): string {
  return `project:${projectId}`;
}

/**
 * One room per person, for anything addressed to a user rather than a project —
 * notifications, chiefly.
 *
 * Unlike a project room this needs no join gate: the id comes from the verified
 * token, so a socket can only ever be placed in its own. The server joins it
 * automatically on connect.
 */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** A task reduced to what a listening client needs to patch its list. */
export type RealtimeTask = Pick<
  TaskDTO,
  | "id"
  | "title"
  | "status"
  | "priority"
  | "projectId"
  | "assigneeId"
  | "assignedById"
  | "assignedAt"
  | "startDate"
  | "dueDate"
  | "updatedAt"
>;

export function toRealtimeTask(task: TaskDTO): RealtimeTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    // Carried so a reassignment updates every open view — the name on a task
    // list, and the "Assigned to / Assigned by" rows on the detail page —.
    // rather than waiting for the next full load.
    assigneeId: task.assigneeId,
    assignedById: task.assignedById,
    assignedAt: task.assignedAt,
    startDate: task.startDate,
    dueDate: task.dueDate,
    updatedAt: task.updatedAt,
  };
}

export type TaskCreatedEvent = {
  type: "TASK_CREATED";
  task: RealtimeTask;
};

export type TaskUpdatedEvent = {
  type: "TASK_UPDATED";
  task: RealtimeTask;
};

export type TaskDeletedEvent = {
  type: "TASK_DELETED";
  taskId: string;
  projectId: string;
};

export type TaskStatusChangedEvent = {
  type: "TASK_STATUS_CHANGED";
  taskId: string;
  projectId: string;
  status: TaskStatus;
  updatedAt: string;
};

export type TaskRealtimeEvent =
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskDeletedEvent
  | TaskStatusChangedEvent;

/** The channel task events travel on inside a project room. */
export const TASK_EVENT_CHANNEL = "task:event";

/**
 * The same task events, delivered to the people they belong to.
 *
 * The dashboard is user-scoped and the task rooms are project-scoped, so a
 * project room can't serve it: it would carry every member's work, and it
 * would carry nothing at all for a personal task, which has no project and so
 * no room.
 *
 * A separate channel rather than reusing TASK_EVENT_CHANNEL in the user room,
 * so a component listening for one never has to reason about the other
 * arriving by a second route.
 */
export const PERSONAL_TASK_CHANNEL = "task:mine";

export const REALTIME_EVENTS = [
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_DELETED",
  "TASK_STATUS_CHANGED",
] as const;

/** Notifications ride their own channel, into the recipient's user room. */
export const NOTIFICATION_EVENT_CHANNEL = "notification:event";

export type NotificationRealtimeEvent = {
  type: "NOTIFICATION_CREATED";
  notification: NotificationDTO;
  /** Recipient's unread count after this one, so the badge needs no refetch. */
  unread: number;
};

/**
 * What the Next app POSTs to the relay.
 *
 * An envelope rather than a bare event, so the relay never has to understand a
 * payload: it reads the room and the channel and forwards the rest untouched.
 * Adding a new kind of live update is then a change to this app alone — the
 * always-on process doesn't need redeploying.
 */
export type EmitEnvelope = {
  room: string;
  channel: string;
  payload: unknown;
};

/**
 * The claim set inside a socket token.
 *
 * `projects` is the list the *server* decided this user may join, computed once
 * when the token is issued. The realtime server then needs no database access —
 * it checks the requested room against this list and nothing else.
 */
export type SocketTokenClaims = {
  userId: string;
  projects: string[];
  scope: "realtime";
};

/** Short enough that revoked access expires quickly, long enough to be cheap. */
export const SOCKET_TOKEN_TTL_SECONDS = 15 * 60;

/**
 * What the socket is actually doing.
 *
 * `connecting` and `reconnecting` are separate because they mean different
 * things to a reader: the first is a page that has just loaded, the second is
 * a connection that was working and dropped. Collapsing them made a first page
 * load announce "Reconnecting…" before it had ever connected to anything.
 *
 * `offline` means no live connection — the app is on its polling fallback and
 * still working, which is why the indicator does not treat it as an error.
 */
export type ConnectionState =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "offline";
