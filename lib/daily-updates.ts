import mongoose from "mongoose";

import DailyUpdate from "@/models/DailyUpdate";
import User from "@/models/User";
import { parseStartDate } from "./dates";
import type { ActionResult, ActionStatus } from "./members";
import {
  MAX_HOURS_PER_UPDATE,
  UPDATE_CONTENT_MAX,
  type DailyUpdateDTO,
} from "./types";

const fail = (status: ActionStatus, error: string): ActionResult<never> => ({
  ok: false,
  status,
  error,
});

type RawUpdate = {
  _id: unknown;
  date?: Date;
  content?: string;
  blocker?: string;
  hoursWorked?: number;
  userId?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
};

/** Local YYYY-MM-DD — the same convention the calendar uses. */
function dayString(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function serialize(doc: RawUpdate, authorName: string): DailyUpdateDTO {
  return {
    id: String(doc._id),
    date: dayString(doc.date ?? new Date()),
    content: doc.content ?? "",
    blocker: doc.blocker ?? "",
    hoursWorked: doc.hoursWorked ?? 0,
    authorId: String(doc.userId ?? ""),
    authorName,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

async function namesFor(rows: RawUpdate[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((row) => String(row.userId)))].filter(Boolean);
  if (ids.length === 0) return new Map();

  const users = await User.find({ _id: { $in: ids } })
    .select("name")
    .lean<{ _id: unknown; name?: string }[]>();

  return new Map(users.map((u) => [String(u._id), u.name ?? "Unknown"]));
}

export async function getDailyUpdates(
  taskId: string,
): Promise<DailyUpdateDTO[]> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return [];

  // Newest first — the acceptance criteria call for it, and it's what the
  // compound index is ordered for.
  const rows = await DailyUpdate.find({ taskId })
    .sort({ date: -1, createdAt: -1 })
    .lean<RawUpdate[]>();

  const names = await namesFor(rows);

  return rows.map((row) => serialize(row, names.get(String(row.userId)) ?? "Unknown"));
}

type ParsedInput = {
  date: Date;
  content: string;
  blocker: string;
  hoursWorked: number;
};

function parseInput(
  body: unknown,
  { partial }: { partial: boolean },
): ActionResult<Partial<ParsedInput>> {
  const input = (body ?? {}) as Record<string, unknown>;
  const value: Partial<ParsedInput> = {};

  if (!partial || "date" in input) {
    const raw = typeof input.date === "string" ? input.date : "";
    const parsed = raw ? parseStartDate(raw) : null;
    if (!parsed) return fail(400, "A valid date is required");
    value.date = parsed;
  }

  if (!partial || "content" in input) {
    const content = typeof input.content === "string" ? input.content.trim() : "";
    if (!content) return fail(400, "Describe what you worked on");
    if (content.length > UPDATE_CONTENT_MAX) {
      return fail(400, `Keep it under ${UPDATE_CONTENT_MAX} characters`);
    }
    value.content = content;
  }

  if (!partial || "blocker" in input) {
    const blocker = typeof input.blocker === "string" ? input.blocker.trim() : "";
    if (blocker.length > UPDATE_CONTENT_MAX) {
      return fail(400, `Keep it under ${UPDATE_CONTENT_MAX} characters`);
    }
    value.blocker = blocker;
  }

  if (!partial || "hoursWorked" in input) {
    const raw = input.hoursWorked;
    const hours = typeof raw === "number" ? raw : Number(raw ?? 0);

    if (!Number.isFinite(hours)) return fail(400, "Hours must be a number");
    if (hours < 0) return fail(400, "Hours can't be negative");
    if (hours > MAX_HOURS_PER_UPDATE) {
      return fail(400, `A single day can't exceed ${MAX_HOURS_PER_UPDATE} hours`);
    }

    // Quarter-hour precision keeps the stored value tidy for later analytics.
    value.hoursWorked = Math.round(hours * 4) / 4;
  }

  return { ok: true, value };
}

export async function createDailyUpdate(
  taskId: string,
  projectId: string | null,
  userId: string,
  body: unknown,
): Promise<ActionResult<DailyUpdateDTO>> {
  const parsed = parseInput(body, { partial: false });
  if (!parsed.ok) return parsed;

  const created = await DailyUpdate.create({
    taskId,
    projectId,
    userId,
    ...parsed.value,
  });

  const user = await User.findById(userId)
    .select("name")
    .lean<{ name?: string } | null>();

  return {
    ok: true,
    value: serialize(created.toObject(), user?.name ?? "Unknown"),
  };
}

/**
 * Edits an update.
 *
 * Only the author may change their own words. Someone with task-delete rights
 * can remove an update (see below) but not rewrite it as if the author had.
 */
export async function updateDailyUpdate(
  taskId: string,
  updateId: string,
  userId: string,
  body: unknown,
): Promise<ActionResult<DailyUpdateDTO>> {
  if (!mongoose.Types.ObjectId.isValid(updateId)) {
    return fail(404, "Update not found");
  }

  const existing = await DailyUpdate.findOne({ _id: updateId, taskId })
    .select("userId")
    .lean<{ userId?: unknown } | null>();

  if (!existing) return fail(404, "Update not found");

  if (String(existing.userId) !== String(userId)) {
    return fail(403, "You can only edit your own updates");
  }

  const parsed = parseInput(body, { partial: true });
  if (!parsed.ok) return parsed;
  if (Object.keys(parsed.value).length === 0) {
    return fail(400, "Nothing to update");
  }

  const updated = await DailyUpdate.findOneAndUpdate(
    { _id: updateId, taskId },
    parsed.value,
    { returnDocument: "after" },
  ).lean<RawUpdate | null>();

  if (!updated) return fail(404, "Update not found");

  const user = await User.findById(userId)
    .select("name")
    .lean<{ name?: string } | null>();

  return { ok: true, value: serialize(updated, user?.name ?? "Unknown") };
}

export async function deleteDailyUpdate(
  taskId: string,
  updateId: string,
  userId: string,
  /** True for the task owner or a project admin. */
  canModerate: boolean,
): Promise<ActionResult> {
  if (!mongoose.Types.ObjectId.isValid(updateId)) {
    return fail(404, "Update not found");
  }

  const existing = await DailyUpdate.findOne({ _id: updateId, taskId })
    .select("userId")
    .lean<{ userId?: unknown } | null>();

  if (!existing) return fail(404, "Update not found");

  const isAuthor = String(existing.userId) === String(userId);
  if (!isAuthor && !canModerate) {
    return fail(403, "You can only delete your own updates");
  }

  await DailyUpdate.deleteOne({ _id: updateId, taskId });

  return { ok: true, value: undefined };
}

export async function deleteUpdatesForTask(taskId: string): Promise<void> {
  await DailyUpdate.deleteMany({ taskId });
}

/** Total logged hours for a task — the figure Analytics will consume. */
export async function getTotalHours(taskId: string): Promise<number> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return 0;

  const [row] = await DailyUpdate.aggregate<{ total: number }>([
    { $match: { taskId: new mongoose.Types.ObjectId(taskId) } },
    { $group: { _id: null, total: { $sum: "$hoursWorked" } } },
  ]);

  return Math.round((row?.total ?? 0) * 4) / 4;
}
