import mongoose from "mongoose";

import { LINK_TITLE_MAX } from "@/lib/types";

const TaskLinkSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
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
    title: { type: String, required: true, trim: true, maxlength: LINK_TITLE_MAX },
    /** Validated to http/https before it reaches here — see lib/task-links.ts. */
    url: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export default mongoose.models.TaskLink ||
  mongoose.model("TaskLink", TaskLinkSchema);
