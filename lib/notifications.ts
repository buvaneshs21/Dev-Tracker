import mongoose from "mongoose";

import Notification from "@/models/Notification";
import User from "@/models/User";
import { getUserPreferences } from "./preferences";
import { emitNotificationEvent } from "./realtime/emit";
import {
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_PREFERENCE_FOR,
  type NotificationDTO,
  type NotificationFeed,
  type NotificationType,
} from "./types";

type RawNotification = {
  _id: unknown;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  actorName?: string | null;
  taskId?: unknown;
  projectId?: unknown;
  readAt?: Date | null;
  createdAt?: Date | null;
};

function serialize(doc: RawNotification): NotificationDTO {
  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title ?? "",
    body: doc.body ?? "",
    actorName: doc.actorName ?? "Someone",
    taskId: doc.taskId ? String(doc.taskId) : null,
    projectId: doc.projectId ? String(doc.projectId) : null,
    read: Boolean(doc.readAt),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

export type NewNotification = {
  /** The recipient. */
  userId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  title: string;
  body?: string;
  taskId?: string | null;
  projectId?: string | null;
};

/**
 * Records a notification and pushes it to the recipient.
 *
 * Silently does nothing in three cases, all of them normal rather than errors:
 * you caused it yourself, you switched that category off in Settings, or the
 * ids don't parse. Callers are notification-agnostic — they announce what
 * happened and this decides whether anyone hears it.
 *
 * Never throws. A failure here must not roll back the action that caused it:
 * the task really was assigned, whether or not the bell lit up.
 */
export async function notify(input: NewNotification): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(input.userId)) return;

    // Your own actions are not news to you.
    if (String(input.userId) === String(input.actorId)) return;

    const preferences = await getUserPreferences(input.userId);
    if (!preferences.notifications[NOTIFICATION_PREFERENCE_FOR[input.type]]) {
      return;
    }

    const created = await Notification.create({
      userId: input.userId,
      type: input.type,
      actorId: mongoose.Types.ObjectId.isValid(input.actorId)
        ? input.actorId
        : null,
      actorName: input.actorName,
      title: input.title,
      body: input.body ?? "",
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? null,
      readAt: null,
    });

    const unread = await getUnreadCount(input.userId);

    // Carries the fresh count so the badge updates without a round trip.
    emitNotificationEvent(input.userId, {
      type: "NOTIFICATION_CREATED",
      notification: serialize(created.toObject()),
      unread,
    });
  } catch (err) {
    console.error("[notifications] notify failed", err);
  }
}

/**
 * The name to attribute an action to, snapshotted into the notification.
 *
 * Falls back rather than failing: an unnamed actor is a cosmetic problem, and
 * suppressing the whole notification over it would be worse.
 */
export async function getActorName(userId: string): Promise<string> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return "Someone";

  const user = await User.findById(userId)
    .select("name")
    .lean<{ name?: string } | null>();

  return user?.name || "Someone";
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 0;

  return Notification.countDocuments({ userId, readAt: null });
}

/** The bell panel: the newest page, plus the unread total across all of them. */
export async function getNotificationFeed(
  userId: string,
): Promise<NotificationFeed> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { items: [], unread: 0 };
  }

  const [rows, unread] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(NOTIFICATION_PAGE_SIZE)
      .lean<RawNotification[]>(),
    getUnreadCount(userId),
  ]);

  return { items: rows.map(serialize), unread };
}

/**
 * Marks one notification read, or all of them.
 *
 * Both paths are scoped to the calling user, so an id belonging to someone else
 * matches nothing rather than being an error — there's no way to probe whether
 * a notification exists.
 */
export async function markRead(
  userId: string,
  id: string | null,
): Promise<NotificationFeed> {
  if (mongoose.Types.ObjectId.isValid(userId)) {
    const filter: Record<string, unknown> = { userId, readAt: null };
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return getNotificationFeed(userId);
      filter._id = id;
    }

    await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  }

  return getNotificationFeed(userId);
}

/**
 * Removes notifications pointing at a task that's being deleted.
 *
 * The snapshotted title would still read correctly, but a bell entry that
 * navigates to a 404 is worse than no entry at all.
 */
export async function deleteNotificationsForTask(taskId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return;
  await Notification.deleteMany({ taskId });
}
