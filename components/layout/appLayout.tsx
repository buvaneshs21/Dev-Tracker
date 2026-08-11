import { ReactNode } from "react";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface AppLayoutProps {
  title: string;
  user: { name: string; email: string };
  /** Pre-fills the navbar search when the page was reached from a search. */
  defaultQuery?: string;
  children: ReactNode;
}

/** The shell every authenticated page renders inside. */
export default function AppLayout({
  title,
  user,
  defaultQuery,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar title={title} user={user} defaultQuery={defaultQuery} />

        <main className="flex-1 px-6 py-8 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
