import mongoose from "mongoose";

import { defineModel } from "@/lib/model";

import { PROJECT_ROLES } from "@/lib/types";

const ProjectMemberSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: PROJECT_ROLES,
      required: true,
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// A user belongs to a project at most once. Enforced in the database, not just
// in application code, so a double-accepted invitation can't create a duplicate.
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export default defineModel("ProjectMember", ProjectMemberSchema);
