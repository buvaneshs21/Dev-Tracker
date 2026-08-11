import mongoose from "mongoose";

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

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);
