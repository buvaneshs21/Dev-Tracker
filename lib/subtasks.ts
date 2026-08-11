import mongoose from "mongoose";

import Subtask from "@/models/Subtask";
import type { ActionResult, ActionStatus } from "./members";
import { SUBTASK_TITLE_MAX, type SubtaskDTO } from "./types";

const fail = (status: ActionStatus, error: string): ActionResult<never> => ({
  ok: false,
  status,
  error,
});

type RawSubtask = {
  _id: unknown;
  title?: string;
  completed?: boolean;
  order?: number;
  createdAt?: Date;
};

function serialize(doc: RawSubtask): SubtaskDTO {
  return {
    id: String(doc._id),
    title: doc.title ?? "",
    completed: doc.completed === true,
    order: doc.order ?? 0,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

export async function getSubtasks(taskId: string): Promise<SubtaskDTO[]> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return [];

  const rows = await Subtask.find({ taskId })
    .sort({ order: 1, createdAt: 1 })
    .lean<RawSubtask[]>();

  return rows.map(serialize);
}

export async function createSubtask(
  taskId: string,
  body: unknown,
): Promise<ActionResult<SubtaskDTO>> {
  const input = (body ?? {}) as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";

  if (!title) return fail(400, "Subtask title is required");
  if (title.length > SUBTASK_TITLE_MAX) {
    return fail(400, `Keep it under ${SUBTASK_TITLE_MAX} characters`);
  }

  // Append to the end of the checklist.
  const last = await Subtask.findOne({ taskId })
    .sort({ order: -1 })
    .select("order")
    .lean<{ order?: number } | null>();

  const created = await Subtask.create({
    taskId,
    title,
    completed: false,
    order: (last?.order ?? -1) + 1,
  });

  return { ok: true, value: serialize(created.toObject()) };
}

export async function updateSubtask(
  taskId: string,
  subtaskId: string,
  body: unknown,
): Promise<ActionResult<SubtaskDTO>> {
  if (!mongoose.Types.ObjectId.isValid(subtaskId)) {
    return fail(404, "Subtask not found");
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("title" in input) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) return fail(400, "Subtask title is required");
    if (title.length > SUBTASK_TITLE_MAX) {
      return fail(400, `Keep it under ${SUBTASK_TITLE_MAX} characters`);
    }
    update.title = title;
  }

  if ("completed" in input) {
    if (typeof input.completed !== "boolean") {
      return fail(400, "Invalid completed value");
    }
    update.completed = input.completed;
  }

  if ("order" in input) {
    if (typeof input.order !== "number" || !Number.isFinite(input.order)) {
      return fail(400, "Invalid order");
    }
    update.order = input.order;
  }

  if (Object.keys(update).length === 0) return fail(400, "Nothing to update");

  // taskId in the filter as well as the id — a subtask can only be changed
  // through the task the caller was authorised against.
  const updated = await Subtask.findOneAndUpdate(
    { _id: subtaskId, taskId },
    update,
    { returnDocument: "after" },
  ).lean<RawSubtask | null>();

  if (!updated) return fail(404, "Subtask not found");

  return { ok: true, value: serialize(updated) };
}

export async function deleteSubtask(
  taskId: string,
  subtaskId: string,
): Promise<ActionResult> {
  if (!mongoose.Types.ObjectId.isValid(subtaskId)) {
    return fail(404, "Subtask not found");
  }

  const removed = await Subtask.findOneAndDelete({
    _id: subtaskId,
    taskId,
  }).lean();

  if (!removed) return fail(404, "Subtask not found");

  return { ok: true, value: undefined };
}

/** Deletes every subtask of a task — used when the task itself is removed. */
export async function deleteSubtasksForTask(taskId: string): Promise<void> {
  await Subtask.deleteMany({ taskId });
}
