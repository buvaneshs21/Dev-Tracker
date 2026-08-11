import mongoose from "mongoose";

import UserPreferences from "@/models/UserPreferences";
import type { ActionResult, ActionStatus } from "./members";
import {
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PREFERENCES,
  isTheme,
  isWeekStart,
  type NotificationPreferences,
  type UserPreferencesDTO,
} from "./types";

const fail = (status: ActionStatus, error: string): ActionResult<never> => ({
  ok: false,
  status,
  error,
});

type RawPreferences = {
  theme?: unknown;
  weekStartsOn?: unknown;
  compactMode?: unknown;
  notifications?: Partial<NotificationPreferences> | null;
};

function serialize(doc: RawPreferences | null): UserPreferencesDTO {
  if (!doc) return DEFAULT_PREFERENCES;

  return {
    theme: isTheme(doc.theme) ? doc.theme : DEFAULT_PREFERENCES.theme,
    weekStartsOn: isWeekStart(doc.weekStartsOn)
      ? doc.weekStartsOn
      : DEFAULT_PREFERENCES.weekStartsOn,
    compactMode: doc.compactMode === true,
    notifications: { ...DEFAULT_NOTIFICATIONS, ...(doc.notifications ?? {}) },
  };
}

/**
 * A user's preferences, or the defaults.
 *
 * Read-only: no document is created just because someone looked. The row
 * appears on first save, so an untouched account costs nothing.
 */
export async function getUserPreferences(
  userId: string,
): Promise<UserPreferencesDTO> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return DEFAULT_PREFERENCES;

  const doc = await UserPreferences.findOne({ userId }).lean<RawPreferences | null>();
  return serialize(doc);
}

export async function updateUserPreferences(
  userId: string,
  body: unknown,
): Promise<ActionResult<UserPreferencesDTO>> {
  if (!body || typeof body !== "object") return fail(400, "Invalid request");

  const input = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("theme" in input) {
    if (!isTheme(input.theme)) return fail(400, "Invalid theme");
    update.theme = input.theme;
  }

  if ("weekStartsOn" in input) {
    if (!isWeekStart(input.weekStartsOn)) {
      return fail(400, "Invalid week start");
    }
    update.weekStartsOn = input.weekStartsOn;
  }

  if ("compactMode" in input) {
    if (typeof input.compactMode !== "boolean") {
      return fail(400, "Invalid compact mode value");
    }
    update.compactMode = input.compactMode;
  }

  if ("notifications" in input) {
    const notifications = input.notifications;
    if (!notifications || typeof notifications !== "object") {
      return fail(400, "Invalid notification preferences");
    }

    for (const key of Object.keys(
      DEFAULT_NOTIFICATIONS,
    ) as (keyof NotificationPreferences)[]) {
      const value = (notifications as Record<string, unknown>)[key];
      if (value === undefined) continue;
      if (typeof value !== "boolean") {
        return fail(400, `Invalid value for ${key}`);
      }
      update[`notifications.${key}`] = value;
    }
  }

  if (Object.keys(update).length === 0) return fail(400, "Nothing to update");

  // Upsert: the row is created on first save, keyed by the unique userId.
  const doc = await UserPreferences.findOneAndUpdate(
    { userId },
    { $set: update, $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after" },
  ).lean<RawPreferences | null>();

  return { ok: true, value: serialize(doc) };
}
