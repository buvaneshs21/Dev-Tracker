import mongoose from "mongoose";

import { defineModel } from "@/lib/model";

import {
  DEFAULT_NOTIFICATIONS,
  THEMES,
  WEEK_STARTS,
} from "@/lib/types";

const UserPreferencesSchema = new mongoose.Schema(
  {
    // Unique: one preferences document per user, enforced by the database so a
    // race between two saves can't create a second.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    theme: { type: String, enum: THEMES, default: "system" },
    weekStartsOn: { type: String, enum: WEEK_STARTS, default: "monday" },
    compactMode: { type: Boolean, default: false },
    notifications: {
      taskUpdates: {
        type: Boolean,
        default: DEFAULT_NOTIFICATIONS.taskUpdates,
      },
      projectUpdates: {
        type: Boolean,
        default: DEFAULT_NOTIFICATIONS.projectUpdates,
      },
      teamActivity: {
        type: Boolean,
        default: DEFAULT_NOTIFICATIONS.teamActivity,
      },
      calendarReminders: {
        type: Boolean,
        default: DEFAULT_NOTIFICATIONS.calendarReminders,
      },
    },
  },
  { timestamps: true },
);

export default defineModel("UserPreferences", UserPreferencesSchema);
