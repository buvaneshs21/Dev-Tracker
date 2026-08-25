import mongoose from "mongoose";

import { defineModel } from "@/lib/model";

import { NOTIFICATION_TYPES } from "@/lib/types";

const NotificationSchema = new mongoose.Schema(
  {
    // The recipient. Every query is "my notifications", so this leads the
    // compound index below.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    // Who caused it. Kept as a reference for future filtering; the name is
    // denormalised into actorName so the panel needs no join.
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorName: { type: String, default: "Someone" },

    // Snapshotted, not joined. A notification records something that already
    // happened, so it has to keep reading correctly after the task is renamed
    // or deleted.
    title: { type: String, required: true },
    body: { type: String, default: "" },

    // Where clicking it should go. Nullable because the target can be deleted,
    // and because MEMBER_JOINED has no task.
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    // Null means unread. A nullable date rather than a boolean so "when did
    // they see this" is available later without another field.
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The two queries the bell makes: newest-first for the panel, and a count of
// the unread. Both are served by this one index.
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export default defineModel("Notification", NotificationSchema);
