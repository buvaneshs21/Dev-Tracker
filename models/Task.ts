import mongoose from "mongoose";

import { defineModel } from "@/lib/model";

const TaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional by design: tasks existed before projects did, and a task is
    // still meaningful on its own. Existing documents have no projectId at all,
    // which reads back as null — they stay valid and keep working.
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    // Who the task is *for*. Null on every task created before assignment
    // existed, and on personal tasks nobody has handed anywhere — both read
    // back as "the creator", so no migration is needed. See serializeTask.
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    // Who handed it over, and when. Null until someone actually assigns the
    // task — a task nobody has reassigned was never "assigned by" anyone, and
    // claiming the creator did it would be inventing history.
    assignedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    title: String,
    description: String,
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // Both dates optional: tasks existed before either field did, and absent
    // values read back as null rather than making the document invalid.
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    // Stamped when a task moves into "completed" and cleared when it moves back
    // out. The productivity chart plots real completion days from this — using
    // updatedAt instead would count any edit as a completion.
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default defineModel("Task", TaskSchema);
