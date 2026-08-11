import { redirect } from "next/navigation";

import PreferencesSettings from "@/components/settings/PreferencesSettings";
import { getUserPreferences } from "@/lib/preferences";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

export const metadata = { title: "Preferences" };

export default async function PreferencesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const preferences = await getUserPreferences(session.userId);

  return <PreferencesSettings initial={preferences} />;
}
