import { redirect } from "next/navigation";

import AppearanceSettings from "@/components/settings/AppearanceSettings";
import { getUserPreferences } from "@/lib/preferences";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

export const metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const preferences = await getUserPreferences(session.userId);

  return <AppearanceSettings initialTheme={preferences.theme} />;
}
