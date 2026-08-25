import mongoose from "mongoose";

import User from "@/models/User";
import { getProjectMembership } from "./permissions";

export type Assignee = { userId: string; name: string };

/**
 * Checks that a task may be handed to a given person, and resolves their name.
 *
 * The rule is deliberately narrow: you can only assign work to someone who is
 * already a member of the task's project. Without that, an assignee field is a
 * way to push tasks into strangers' workspaces — they'd see a task they never
 * agreed to, in a project they can't open.
 *
 * A task with no project has exactly one legitimate assignee, its creator;
 * there's no shared context to hand it around in.
 *
 * Returns null for "not allowed", which callers turn into a 400 — the target
 * either isn't a real user or isn't on the project, and distinguishing those
 * would leak which user ids exist.
 */
export async function resolveAssignee(
  projectId: string | null,
  creatorId: string,
  assigneeId: string,
): Promise<Assignee | null> {
  if (!mongoose.Types.ObjectId.isValid(assigneeId)) return null;

  const isCreator = String(assigneeId) === String(creatorId);

  if (!projectId) {
    // No project, no shared context — only the creator is valid.
    if (!isCreator) return null;
  } else if (!isCreator) {
    const membership = await getProjectMembership(assigneeId, projectId);
    if (!membership) return null;
  }

  const user = await User.findById(assigneeId)
    .select("name")
    .lean<{ name?: string } | null>();

  if (!user) return null;

  return { userId: String(assigneeId), name: user.name ?? "Unknown user" };
}
