import mongoose from "mongoose";

import TaskLink from "@/models/TaskLink";
import User from "@/models/User";
import type { ActionResult, ActionStatus } from "./members";
import { LINK_TITLE_MAX, type TaskLinkDTO } from "./types";

const fail = (status: ActionStatus, error: string): ActionResult<never> => ({
  ok: false,
  status,
  error,
});

type RawLink = {
  _id: unknown;
  title?: string;
  url?: string;
  userId?: unknown;
  createdAt?: Date;
};

function serialize(doc: RawLink): TaskLinkDTO {
  return {
    id: String(doc._id),
    title: doc.title ?? "",
    url: doc.url ?? "",
    addedById: String(doc.userId ?? ""),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

/**
 * Accepts only http(s).
 *
 * Rejecting other schemes matters: a stored `javascript:` URL rendered into an
 * href is a stored-XSS vector, and `data:`/`file:` are equally unwelcome in a
 * link someone else on the project will click.
 */
export function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Bare domains are a common paste; assume https rather than rejecting.
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function getTaskLinks(taskId: string): Promise<TaskLinkDTO[]> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return [];

  const rows = await TaskLink.find({ taskId })
    .sort({ createdAt: -1 })
    .lean<RawLink[]>();

  return rows.map(serialize);
}

export async function createTaskLink(
  taskId: string,
  projectId: string | null,
  userId: string,
  body: unknown,
): Promise<ActionResult<TaskLinkDTO>> {
  const input = (body ?? {}) as Record<string, unknown>;

  const url = normalizeUrl(input.url);
  if (!url) {
    return fail(400, "Enter a valid http or https link");
  }

  const rawTitle = typeof input.title === "string" ? input.title.trim() : "";
  // Fall back to the hostname so a link is never rendered with an empty label.
  const title = (rawTitle || new URL(url).hostname).slice(0, LINK_TITLE_MAX);

  const created = await TaskLink.create({
    taskId,
    projectId,
    userId,
    title,
    url,
  });

  return { ok: true, value: serialize(created.toObject()) };
}

export async function deleteTaskLink(
  taskId: string,
  linkId: string,
): Promise<ActionResult> {
  if (!mongoose.Types.ObjectId.isValid(linkId)) {
    return fail(404, "Link not found");
  }

  const removed = await TaskLink.findOneAndDelete({
    _id: linkId,
    taskId,
  }).lean();

  if (!removed) return fail(404, "Link not found");

  return { ok: true, value: undefined };
}

export async function deleteLinksForTask(taskId: string): Promise<void> {
  await TaskLink.deleteMany({ taskId });
}

/** Resolves author names for a set of links, for display only. */
export async function attachAuthorNames(
  links: TaskLinkDTO[],
): Promise<Map<string, string>> {
  const ids = [...new Set(links.map((link) => link.addedById))].filter(Boolean);
  if (ids.length === 0) return new Map();

  const users = await User.find({ _id: { $in: ids } })
    .select("name")
    .lean<{ _id: unknown; name?: string }[]>();

  return new Map(users.map((u) => [String(u._id), u.name ?? "Unknown"]));
}
