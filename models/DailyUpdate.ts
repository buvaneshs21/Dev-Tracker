import mongoose from "mongoose";

import { defineModel } from "@/lib/model";

import { UPDATE_CONTENT_MAX } from "@/lib/types";

const DailyUpdateSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    // Denormalised from the task so Analytics can aggregate hours per project
    // without joining through tasks. Null for tasks with no project.
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** The day the work happened — stored at local midnight. */
    date: { type: Date, required: true, index: true },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: UPDATE_CONTENT_MAX,
    },
    blocker: { type: String, default: "", trim: true, maxlength: UPDATE_CONTENT_MAX },
    // Indexed alongside date so a future "hours per week" query is cheap.
    hoursWorked: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// The list is always "this task's updates, newest first".
DailyUpdateSchema.index({ taskId: 1, date: -1 });

export default defineModel("DailyUpdate", DailyUpdateSchema);
