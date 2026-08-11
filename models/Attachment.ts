import mongoose from "mongoose";

import { ATTACHMENT_CATEGORIES } from "@/lib/attachment-config";

const AttachmentSchema = new mongoose.Schema(
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
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** The name the user sees. Never used to build a filesystem path. */
    fileName: { type: String, required: true, trim: true },
    /**
     * Opaque key handed back by the storage adapter. Metadata only — the bytes
     * live in storage, never in MongoDB.
     */
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    category: { type: String, enum: ATTACHMENT_CATEGORIES, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.Attachment ||
  mongoose.model("Attachment", AttachmentSchema);
