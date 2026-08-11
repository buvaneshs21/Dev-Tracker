import mongoose from "mongoose";

import { PROJECT_COLORS, PROJECT_NAME_MAX, PROJECT_STATUSES } from "@/lib/types";

const ProjectSchema = new mongoose.Schema(
  {
    // Every query filters on this alongside _id — a project is never looked up
    // by id alone.
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: PROJECT_NAME_MAX,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      enum: PROJECT_COLORS,
      default: "indigo",
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "active",
    },
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    // No `progress` field on purpose: progress is derived from the project's
    // tasks, so a stored copy would drift the moment a task changed.
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);
