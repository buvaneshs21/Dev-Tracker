import mongoose from "mongoose";

import Attachment from "@/models/Attachment";
import User from "@/models/User";
import { storage } from "./storage";
import { checkFile, type AttachmentCategory } from "./attachment-config";
import type { ActionResult, ActionStatus } from "./members";
import type { AttachmentDTO } from "./types";

const fail = (status: ActionStatus, error: string): ActionResult<never> => ({
  ok: false,
  status,
  error,
});

type RawAttachment = {
  _id: unknown;
  fileName?: string;
  storageKey?: string;
  mimeType?: string;
  fileSize?: number;
  category?: AttachmentCategory;
  uploadedBy?: unknown;
  createdAt?: Date;
};

function serialize(doc: RawAttachment, uploaderName: string): AttachmentDTO {
  return {
    id: String(doc._id),
    fileName: doc.fileName ?? "file",
    mimeType: doc.mimeType ?? "application/octet-stream",
    fileSize: doc.fileSize ?? 0,
    category: doc.category ?? "document",
    uploadedById: String(doc.uploadedBy ?? ""),
    uploadedByName: uploaderName,
    // An authenticated route, not a storage URL — the key never reaches the
    // browser, so files can't be fetched by guessing.
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    url: `/api/attachments/${String(doc._id)}/raw`,
  };
}

export async function getAttachments(
  taskId: string,
): Promise<AttachmentDTO[]> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return [];

  const rows = await Attachment.find({ taskId })
    .sort({ createdAt: -1 })
    .lean<RawAttachment[]>();

  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((row) => String(row.uploadedBy)))];
  const users = await User.find({ _id: { $in: ids } })
    .select("name")
    .lean<{ _id: unknown; name?: string }[]>();

  const names = new Map(users.map((u) => [String(u._id), u.name ?? "Unknown"]));

  return rows.map((row) =>
    serialize(row, names.get(String(row.uploadedBy)) ?? "Unknown"),
  );
}

/**
 * Validates and stores an uploaded file.
 *
 * Order matters: the file is checked *before* a single byte is written, so a
 * rejected upload leaves nothing behind in storage.
 */
export async function createAttachment(
  taskId: string,
  projectId: string | null,
  userId: string,
  file: File,
): Promise<ActionResult<AttachmentDTO>> {
  const check = checkFile(file.name, file.type, file.size);
  if (!check.ok) return fail(400, check.error);

  const buffer = Buffer.from(await file.arrayBuffer());

  // Re-check the real byte length: `file.size` is a client-supplied claim.
  const verified = checkFile(file.name, file.type, buffer.byteLength);
  if (!verified.ok) return fail(400, verified.error);

  const { key } = await storage.put({
    body: buffer,
    fileName: file.name,
    mimeType: file.type,
  });

  try {
    const created = await Attachment.create({
      taskId,
      projectId,
      uploadedBy: userId,
      fileName: file.name.slice(0, 255),
      storageKey: key,
      mimeType: file.type,
      fileSize: buffer.byteLength,
      category: verified.category,
    });

    const user = await User.findById(userId)
      .select("name")
      .lean<{ name?: string } | null>();

    return {
      ok: true,
      value: serialize(created.toObject(), user?.name ?? "Unknown"),
    };
  } catch (err) {
    // Metadata failed after the bytes landed — remove the orphan rather than
    // leaving a file nothing points at.
    await storage.remove(key).catch(() => {});
    throw err;
  }
}

export type LoadedAttachment = {
  attachment: RawAttachment & { taskId: unknown };
  body: Buffer;
};

/** Reads an attachment's bytes. The caller must have authorised the task. */
export async function readAttachment(
  attachmentId: string,
): Promise<LoadedAttachment | null> {
  if (!mongoose.Types.ObjectId.isValid(attachmentId)) return null;

  const attachment = await Attachment.findById(attachmentId).lean<
    (RawAttachment & { taskId: unknown }) | null
  >();

  if (!attachment?.storageKey) return null;

  try {
    const body = await storage.get(attachment.storageKey);
    return { attachment, body };
  } catch {
    // Metadata without bytes — a partially-restored backup, say.
    return null;
  }
}

export async function findAttachment(attachmentId: string) {
  if (!mongoose.Types.ObjectId.isValid(attachmentId)) return null;

  return Attachment.findById(attachmentId).lean<
    (RawAttachment & { taskId: unknown; uploadedBy: unknown }) | null
  >();
}

/**
 * Removes the object first, then the metadata.
 *
 * If storage fails, the metadata stays and an error is returned — the row is
 * never deleted while the file survives, which would leak an unreferenced,
 * unreachable object forever.
 */
export async function deleteAttachment(
  attachmentId: string,
): Promise<ActionResult> {
  const attachment = await findAttachment(attachmentId);
  if (!attachment?.storageKey) return fail(404, "Attachment not found");

  try {
    await storage.remove(attachment.storageKey);
  } catch (err) {
    console.error("[attachments] storage delete failed", err);
    return fail(
      500,
      "The file couldn't be removed from storage, so nothing was deleted. Try again.",
    );
  }

  await Attachment.deleteOne({ _id: attachmentId });

  return { ok: true, value: undefined };
}

/** Best-effort cleanup when a whole task goes away. */
export async function deleteAttachmentsForTask(taskId: string): Promise<void> {
  const rows = await Attachment.find({ taskId })
    .select("storageKey")
    .lean<{ storageKey?: string }[]>();

  await Promise.all(
    rows
      .filter((row) => row.storageKey)
      .map((row) => storage.remove(row.storageKey!).catch(() => {})),
  );

  await Attachment.deleteMany({ taskId });
}
