import { redirect } from "next/navigation";

import DangerZone from "@/components/settings/DangerZone";
import { getDeletionBlockers, getUserProfile } from "@/lib/users";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

export const metadata = { title: "Danger Zone" };

export default async function DangerZonePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const [profile, blockers] = await Promise.all([
    getUserProfile(session.userId),
    getDeletionBlockers(session.userId),
  ]);

  if (!profile) redirect("/login");

  return <DangerZone email={profile.email} blockers={blockers} />;
}
