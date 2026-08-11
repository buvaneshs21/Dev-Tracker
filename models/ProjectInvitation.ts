import mongoose from "mongoose";

import { INVITATION_STATUSES, INVITABLE_ROLES } from "@/lib/types";

const ProjectInvitationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    // Stored lowercased; the invitee may not have an account yet, so this is an
    // email rather than a userId.
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: INVITABLE_ROLES,
      required: true,
      default: "member",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Unique so a token collision surfaces as a write error rather than
    // granting access to the wrong project.
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      required: true,
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// Serves the "is there already a pending invite for this address?" check.
ProjectInvitationSchema.index({ projectId: 1, email: 1, status: 1 });

export default mongoose.models.ProjectInvitation ||
  mongoose.model("ProjectInvitation", ProjectInvitationSchema);
