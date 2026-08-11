import "./globals.css";
import type { Metadata } from "next";

import SystemThemeSync from "@/components/settings/SystemThemeSync";
import { getSession } from "@/lib/session";
import { getUserPreferences } from "@/lib/preferences";
import { connectDB } from "@/lib/mongodb";
import { THEME_SCRIPT } from "@/lib/theme";
import { DEFAULT_PREFERENCES } from "@/lib/types";

export const metadata: Metadata = {
  title: {
    default: "DevTrack",
    template: "%s · DevTrack",
  },
  description: "A focused workspace for tasks, milestones and progress.",
};

/**
 * Reads the signed-in user's theme so the correct one is in the HTML on first
 * byte. Falls back to defaults for signed-out pages, where the inline script
 * uses localStorage instead. A database hiccup must never break the shell, so
 * the lookup is wrapped.
 */
async function loadPreferences() {
  try {
    const session = await getSession();
    if (!session) return DEFAULT_PREFERENCES;

    await connectDB();
    return await getUserPreferences(session.userId);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const preferences = await loadPreferences();

  return (
    <html
      lang="en"
      data-theme-choice={preferences.theme}
      data-compact={preferences.compactMode ? "true" : undefined}
      suppressHydrationWarning
    >
      <head>
        {/* Must run before paint, so it can't be a component. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased">
        <SystemThemeSync />
        {children}
      </body>
    </html>
  );
}
