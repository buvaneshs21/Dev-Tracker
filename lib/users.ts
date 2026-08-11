import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "@/models/User";
import UserPreferences from "@/models/UserPreferences";
import Project from "@/models/Project";
import ProjectMember from "@/models/ProjectMember";
import ProjectInvitation from "@/models/ProjectInvitation";
import Task from "@/models/Task";
import type { ActionResult, ActionStatus } from "./members";
import { BIO_MAX, NAME_MAX, PASSWORD_MIN, type UserProfileDTO } from "./types";

const fail = (status: ActionStatus, error: string): ActionResult<never> => ({
  ok: false,
  status,
  error,
});

type RawUser = {
  _id: unknown;
  name?: string | null;
  email?: string | null;
  bio?: string | null;
  createdAt?: Date | null;
};

/**
 * Never spreads the document — `password` must not escape this module, so the
 * fields are listed one by one.
 */
export function serializeProfile(doc: RawUser): UserProfileDTO {
  // Accounts created before `timestamps` was added have no createdAt. Every
  // ObjectId embeds its creation time, so older accounts still get a real
  // "member since" without a migration.
  const created =
    doc.createdAt ??
    (doc._id instanceof mongoose.Types.ObjectId
      ? doc._id.getTimestamp()
      : new mongoose.Types.ObjectId(String(doc._id)).getTimestamp());

  return {
    name: doc.name ?? "",
    email: doc.email ?? "",
    bio: doc.bio ?? "",
    createdAt: created.toISOString(),
  };
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfileDTO | null> {
  const user = await User.findById(userId)
    .select("name email bio createdAt")
    .lean<RawUser | null>();

  return user ? serializeProfile(user) : null;
}

export async function updateUserProfile(
  userId: string,
  body: unknown,
): Promise<ActionResult<UserProfileDTO>> {
  if (!body || typeof body !== "object") return fail(400, "Invalid request");

  const input = body as Record<string, unknown>;
  const update: Record<string, string> = {};

  if ("name" in input) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) return fail(400, "Name is required");
    if (name.length > NAME_MAX) {
      return fail(400, `Name must be ${NAME_MAX} characters or fewer`);
    }
    update.name = name;
  }

  if ("bio" in input) {
    const bio = typeof input.bio === "string" ? input.bio.trim() : "";
    if (bio.length > BIO_MAX) {
      return fail(400, `Bio must be ${BIO_MAX} characters or fewer`);
    }
    update.bio = bio;
  }

  // Anything else in the body — email, password, _id — is ignored by omission.
  if (Object.keys(update).length === 0) return fail(400, "Nothing to update");

  const user = await User.findByIdAndUpdate(userId, update, {
    returnDocument: "after",
  })
    .select("name email bio createdAt")
    .lean<RawUser | null>();

  if (!user) return fail(404, "Account not found");

  return { ok: true, value: serializeProfile(user) };
}

export async function changePassword(
  userId: string,
  body: unknown,
): Promise<ActionResult> {
  if (!body || typeof body !== "object") return fail(400, "Invalid request");

  const input = body as Record<string, unknown>;
  const current =
    typeof input.currentPassword === "string" ? input.currentPassword : "";
  const next = typeof input.newPassword === "string" ? input.newPassword : "";
  const confirm =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (!current) return fail(400, "Enter your current password");
  if (next.length < PASSWORD_MIN) {
    return fail(400, `New password must be at least ${PASSWORD_MIN} characters`);
  }
  if (next !== confirm) return fail(400, "New passwords don't match");
  if (next === current) {
    return fail(400, "New password must be different from the current one");
  }

  const user = await User.findById(userId)
    .select("password")
    .lean<{ password?: string } | null>();

  if (!user?.password) return fail(404, "Account not found");

  // Proving possession of the current password is what makes this safe — a
  // stolen session alone must not be enough to lock the owner out.
  const matches = await bcrypt.compare(current, user.password);
  if (!matches) return fail(403, "Your current password is incorrect");

  // Same mechanism and cost factor as registration.
  const hashed = await bcrypt.hash(next, 10);
  await User.updateOne({ _id: userId }, { $set: { password: hashed } });

  return { ok: true, value: undefined };
}

export type DeletionBlocker = { id: string; name: string; memberCount: number };

/**
 * Projects the user owns that other people have joined.
 *
 * Deleting the account would delete those projects and strand collaborators, so
 * the user is asked to resolve them first rather than having it happen silently.
 */
export async function getDeletionBlockers(
  userId: string,
): Promise<DeletionBlocker[]> {
  const owner = new mongoose.Types.ObjectId(userId);

  const owned = await Project.find({ ownerId: owner })
    .select("name")
    .lean<{ _id: unknown; name?: string }[]>();

  if (owned.length === 0) return [];

  const counts = await ProjectMember.aggregate<{
    _id: mongoose.Types.ObjectId;
    others: number;
  }>([
    {
      $match: {
        projectId: { $in: owned.map((p) => new mongoose.Types.ObjectId(String(p._id))) },
        userId: { $ne: owner },
      },
    },
    { $group: { _id: "$projectId", others: { $sum: 1 } } },
  ]);

  const byProject = new Map(counts.map((row) => [String(row._id), row.others]));

  return owned
    .filter((project) => (byProject.get(String(project._id)) ?? 0) > 0)
    .map((project) => ({
      id: String(project._id),
      name: project.name ?? "Untitled project",
      memberCount: (byProject.get(String(project._id)) ?? 0) + 1,
    }));
}

export type DeletionSummary = {
  tasks: number;
  projects: number;
  memberships: number;
  invitations: number;
};

/**
 * Deletes the account and everything belonging to it.
 *
 * Children go first so a failure part-way leaves orphaned rows rather than
 * records pointing at a user that no longer exists.
 */
export async function deleteAccount(
  userId: string,
  confirmEmail: unknown,
): Promise<ActionResult<DeletionSummary>> {
  const user = await User.findById(userId)
    .select("email")
    .lean<{ email?: string } | null>();

  if (!user?.email) return fail(404, "Account not found");

  const typed =
    typeof confirmEmail === "string" ? confirmEmail.trim().toLowerCase() : "";

  if (typed !== user.email.toLowerCase()) {
    return fail(400, "The email you typed doesn't match your account");
  }

  const blockers = await getDeletionBlockers(userId);
  if (blockers.length > 0) {
    return fail(
      409,
      `You still own ${blockers.length} shared project${
        blockers.length === 1 ? "" : "s"
      }. Remove the other members, or delete those projects, before deleting your account.`,
    );
  }

  const owner = new mongoose.Types.ObjectId(userId);

  const owned = await Project.find({ ownerId: owner })
    .select("_id")
    .lean<{ _id: unknown }[]>();
  const ownedIds = owned.map((p) => new mongoose.Types.ObjectId(String(p._id)));

  // Defensive: no one else should have tasks in these projects (the blocker
  // check guarantees it), but detach rather than delete if they somehow do.
  await Task.updateMany(
    { projectId: { $in: ownedIds }, userId: { $ne: owner } },
    { $set: { projectId: null } },
  );

  const tasks = await Task.deleteMany({ userId: owner });
  const invitations = await ProjectInvitation.deleteMany({
    $or: [{ projectId: { $in: ownedIds } }, { invitedBy: owner }],
  });
  const memberships = await ProjectMember.deleteMany({
    $or: [{ projectId: { $in: ownedIds } }, { userId: owner }],
  });
  const projects = await Project.deleteMany({ ownerId: owner });

  await UserPreferences.deleteOne({ userId: owner });
  await User.deleteOne({ _id: owner });

  return {
    ok: true,
    value: {
      tasks: tasks.deletedCount ?? 0,
      projects: projects.deletedCount ?? 0,
      memberships: memberships.deletedCount ?? 0,
      invitations: invitations.deletedCount ?? 0,
    },
  };
}
