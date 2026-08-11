import mongoose from "mongoose";

import { SUBTASK_TITLE_MAX } from "@/lib/types";

const SubtaskSchema = new mongoose.Schema(
  {
    // A separate collection rather than an array on Task: a checklist can grow
    // without bound, and embedding would rewrite the whole task document on
    // every tick.
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: SUBTASK_TITLE_MAX },
    completed: { type: Boolean, default: false },
    /** Sort position. Gaps are fine; only relative order matters. */
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.Subtask ||
  mongoose.model("Subtask", SubtaskSchema);
