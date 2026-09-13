import { ReactNode } from "react";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import SocketProvider from "@/components/realtime/SocketProvider";
import { connectDB } from "@/lib/mongodb";
import { getNotificationFeed } from "@/lib/notifications";
import { getSession } from "@/lib/session";
import type { NotificationFeed } from "@/lib/types";

interface AppLayoutProps {
  title: string;
  user: { name: string; email: string };
  /** Pre-fills the navbar search when the page was reached from a search. */
  defaultQuery?: string;
  children: ReactNode;
}

const EMPTY_FEED: NotificationFeed = { items: [], unread: 0 };

/** The shell every authenticated page renders inside. */
export default async function AppLayout({
  title,
  user,
  defaultQuery,
  children,
}: AppLayoutProps) {
  // Read here rather than fetched on mount, so the bell's count is right in the
  // first paint instead of popping in a moment later. Every page that renders
  // this shell has already established a session.
  const session = await getSession();

  let notifications = EMPTY_FEED;
  if (session) {
    await connectDB();
    notifications = await getNotificationFeed(session.userId);
  }

  return (
    // One socket for the whole authenticated app — components never open their
    // own. Dormant when NEXT_PUBLIC_SOCKET_URL isn't set.
    <SocketProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar
            title={title}
            user={user}
            defaultQuery={defaultQuery}
            notifications={notifications}
            // A boolean, never the key. Without one the launcher renders
            // nothing rather than a button that can only fail.
            assistantEnabled={Boolean(process.env.GEMINI_API_KEY)}
          />

          <main className="flex-1 px-6 py-8 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </SocketProvider>
  );
}
