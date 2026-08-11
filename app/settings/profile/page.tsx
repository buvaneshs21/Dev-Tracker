import { redirect } from "next/navigation";

import ProfileSettings from "@/components/settings/ProfileSettings";
import { getUserProfile } from "@/lib/users";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const profile = await getUserProfile(session.userId);
  if (!profile) redirect("/login");

  return <ProfileSettings profile={profile} />;
}
