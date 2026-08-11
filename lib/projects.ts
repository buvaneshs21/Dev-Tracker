import mongoose from "mongoose";

import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";
import ProjectInvitation from "@/models/ProjectInvitation";
import Task from "@/models/Task";
import { parseDueDate } from "./dates";
import { escapeRegex } from "./tasks";
import {
  canDeleteProject,
  canEditProject,
  getAccessibleProjectIds,
  getProjectMembership,
} from "./permissions";
import { getMemberCounts } from "./members";
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  isProjectColor,
  isProjectStatus,
  type ProjectColor,
  type ProjectDTO,
  type ProjectStats,
  type ProjectStatus,
  type ProjectWithStats,
} from "./types";

type RawProject = {
  _id: unknown;
  name?: string | null;
  description?: string | null;
  color?: ProjectColor | null;
  status?: ProjectStatus | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export function serializeProject(doc: RawProject): ProjectDTO {
  return {
    id: String(doc._id),
    name: doc.name ?? "",
    description: doc.description ?? "",
    color: doc.color ?? "indigo",
    status: doc.status ?? "active",
    startDate: doc.startDate ? new Date(doc.startDate).toISOString() : null,
    dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString() : null,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ProjectInput = {
  name: string;
  description: string;
  color: ProjectColor;
  status: ProjectStatus;
  startDate: Date | null;
  dueDate: Date | null;
};

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const EMPTY_STATS: ProjectStats = {
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  progress: 0,
};

function readDate(value: unknown): Validated<Date | null> {
  if (value === null || value === "" || value === undefined) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "Dates must be sent as strings" };
  }

  const parsed = parseDueDate(value);
  return parsed
    ? { ok: true, value: parsed }
    : { ok: false, error: "Invalid date" };
}

/**
 * Validates request input for create (full) or update (partial). Returns a
 * result rather than throwing so route handlers can map straight to a 400.
 */
export function validateProjectInput(
  body: unknown,
  { partial }: { partial: boolean },
): Validated<Partial<ProjectInput>> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const value: Partial<ProjectInput> = {};

  if (!partial || "name" in input) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) return { ok: false, error: "Project name is required" };
    if (name.length > PROJECT_NAME_MAX) {
      return {
        ok: false,
        error: `Project name must be ${PROJECT_NAME_MAX} characters or fewer`,
      };
    }
    value.name = name;
  }

  if (!partial || "description" in input) {
    const description =
      typeof input.description === "string" ? input.description.trim() : "";
    if (description.length > PROJECT_DESCRIPTION_MAX) {
      return {
        ok: false,
        error: `Description must be ${PROJECT_DESCRIPTION_MAX} characters or fewer`,
      };
    }
    value.description = description;
  }

  if (!partial || "color" in input) {
    const color = input.color ?? "indigo";
    if (!isProjectColor(color)) return { ok: false, error: "Invalid colour" };
    value.color = color;
  }

  if (!partial || "status" in input) {
    const status = input.status ?? "active";
    if (!isProjectStatus(status)) return { ok: false, error: "Invalid status" };
    value.status = status;
  }

  if (!partial || "startDate" in input) {
    const start = readDate(input.startDate);
    if (!start.ok) return { ok: false, error: `Start date: ${start.error}` };
    value.startDate = start.value;
  }

  if (!partial || "dueDate" in input) {
    const due = readDate(input.dueDate);
    if (!due.ok) return { ok: false, error: `Due date: ${due.error}` };
    value.dueDate = due.value;
  }

  return { ok: true, value };
}

/** Cross-field rule, checked against the merged result so PATCH can't sneak past. */
export function validateDateOrder(
  startDate: Date | null | undefined,
  dueDate: Date | null | undefined,
): Validated<true> {
  if (startDate && dueDate && dueDate < startDate) {
    return { ok: false, error: "Due date cannot be before the start date" };
  }
  return { ok: true, value: true };
}

// ---------------------------------------------------------------------------
// Stats — always derived from tasks, never stored
// ---------------------------------------------------------------------------

type StatsRow = {
  _id: mongoose.Types.ObjectId;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
};

function toStats(row: Omit<StatsRow, "_id"> | undefined): ProjectStats {
  if (!row || row.total === 0) return EMPTY_STATS;

  return {
    total: row.total,
    pending: row.pending,
    inProgress: row.inProgress,
    completed: row.completed,
    progress: Math.round((row.completed / row.total) * 100),
  };
}

/**
 * Task counts per project.
 *
 * Deliberately not filtered by userId: a shared project's progress is the whole
 * project's progress, not the caller's slice of it. Callers must authorise
 * access to these project ids first — every one of them does.
 */
async function getStatsFor(
  projectIds: mongoose.Types.ObjectId[],
): Promise<Map<string, ProjectStats>> {
  const stats = new Map<string, ProjectStats>();
  if (projectIds.length === 0) return stats;

  const rows = await Task.aggregate<StatsRow>([
    {
      $match: {
        projectId: { $in: projectIds },
      },
    },
    {
      $group: {
        _id: "$projectId",
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);

  for (const row of rows) {
    stats.set(String(row._id), toStats(row));
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Queries. Every one takes userId and puts it in the filter.
// ---------------------------------------------------------------------------

export type ProjectQuery = { search?: string; status?: ProjectStatus };

export async function getProjects(
  userId: string,
  { search, status }: ProjectQuery = {},
): Promise<ProjectWithStats[]> {
  // Projects the user owns *or* has joined — never the whole collection.
  const accessible = await getAccessibleProjectIds(userId);
  if (accessible.length === 0) return [];

  const filter: Record<string, unknown> = { _id: { $in: accessible } };

  if (status) filter.status = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { description: pattern }];
  }

  const projects = await Project.find(filter)
    .sort({ updatedAt: -1 })
    .lean<RawProject[]>();

  const ids = projects.map((project) => String(project._id));

  const [stats, memberCounts, roles] = await Promise.all([
    getStatsFor(
      ids.map((id) => new mongoose.Types.ObjectId(id)),
    ),
    getMemberCounts(ids),
    Promise.all(ids.map((id) => getProjectMembership(userId, id))),
  ]);

  return projects.map((project, index) => ({
    ...serializeProject(project),
    stats: stats.get(String(project._id)) ?? EMPTY_STATS,
    memberCount: memberCounts.get(String(project._id)) ?? 1,
    role: roles[index]?.role ?? "viewer",
  }));
}

export async function getProjectById(
  projectId: string,
  userId: string,
): Promise<ProjectWithStats | null> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;

  // Membership is the gate — owning it, or having been added to it. A user with
  // neither gets null, which every caller turns into a 404.
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) return null;

  const project = await Project.findById(projectId).lean<RawProject | null>();
  if (!project) return null;

  const [stats, memberCounts] = await Promise.all([
    getStatsFor([new mongoose.Types.ObjectId(projectId)]),
    getMemberCounts([projectId]),
  ]);

  return {
    ...serializeProject(project),
    stats: stats.get(projectId) ?? EMPTY_STATS,
    memberCount: memberCounts.get(projectId) ?? 1,
    role: membership.role,
  };
}

export async function createProject(
  userId: string,
  input: ProjectInput,
): Promise<ProjectDTO> {
  // ownerId comes from the session, never from the request body.
  const project = await Project.create({ ...input, ownerId: userId });

  // The creator is the owner from the outset — no self-invitation step.
  await ProjectMember.create({
    projectId: project._id,
    userId,
    role: "owner",
    joinedAt: new Date(),
  });

  return serializeProject(project.toObject());
}

export async function updateProject(
  projectId: string,
  userId: string,
  input: Partial<ProjectInput>,
): Promise<ProjectDTO | null> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;

  // Owners and admins may edit; members and viewers may not. Enforced here as
  // well as in the route, so no caller can skip it.
  if (!(await canEditProject(userId, projectId))) return null;

  const project = await Project.findOneAndUpdate({ _id: projectId }, input, {
    returnDocument: "after",
  }).lean<RawProject | null>();

  return project ? serializeProject(project) : null;
}

export type DeleteResult = { deleted: boolean; detachedTasks: number };

/**
 * Deletes a project and detaches its tasks rather than deleting them.
 *
 * Tasks are independently meaningful here — they existed before projects and
 * /tasks lists them regardless of project — so cascading the delete would
 * destroy user data as a side effect of removing a grouping. Detaching is
 * reversible; deleting is not. Tasks are unlinked first so that a failure
 * midway leaves orphaned tasks rather than tasks pointing at a project that
 * no longer exists.
 */
export async function deleteProject(
  projectId: string,
  userId: string,
): Promise<DeleteResult> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return { deleted: false, detachedTasks: 0 };
  }

  // Deleting is owner-only; an admin can edit but not destroy.
  if (!(await canDeleteProject(userId, projectId))) {
    return { deleted: false, detachedTasks: 0 };
  }

  // Every task in the project is detached, not just the caller's — otherwise a
  // collaborator's tasks would point at a project that no longer exists.
  const detached = await Task.updateMany(
    { projectId },
    { $set: { projectId: null } },
  );

  await Project.deleteOne({ _id: projectId });
  await ProjectMember.deleteMany({ projectId });
  await ProjectInvitation.deleteMany({ projectId });

  return { deleted: true, detachedTasks: detached.modifiedCount ?? 0 };
}

export async function getProjectProgress(
  projectId: string,
  userId: string,
): Promise<ProjectStats | null> {
  if (!(await getProjectMembership(userId, projectId))) return null;

  const stats = await getStatsFor([new mongoose.Types.ObjectId(projectId)]);

  return stats.get(projectId) ?? EMPTY_STATS;
}
