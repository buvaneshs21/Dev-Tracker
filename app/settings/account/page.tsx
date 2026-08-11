import { redirect } from "next/navigation";

import AccountSettings from "@/components/settings/AccountSettings";
import { getUserProfile } from "@/lib/users";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const profile = await getUserProfile(session.userId);
  if (!profile) redirect("/login");

  return <AccountSettings profile={profile} />;
}
