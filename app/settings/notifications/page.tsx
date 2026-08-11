import { redirect } from "next/navigation";

import NotificationSettings from "@/components/settings/NotificationSettings";
import { getUserPreferences } from "@/lib/preferences";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const preferences = await getUserPreferences(session.userId);

  return <NotificationSettings initial={preferences.notifications} />;
}
