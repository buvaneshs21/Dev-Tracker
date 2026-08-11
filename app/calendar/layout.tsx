import { ReactNode } from "react";
import { redirect } from "next/navigation";

import AppLayout from "@/components/layout/AppLayout";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";

type Account = { name?: string; email?: string } | null;

/**
 * Holds the shell so `loading.tsx` only ever replaces the content column.
 *
 * When the page rendered AppLayout itself, a route-level loading state swapped
 * the whole segment — sidebar and navbar included — which read as the entire
 * page reloading on every month change.
 */
export default async function CalendarLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const account = await User.findById(session.userId)
    .select("name email")
    .lean<Account>();

  return (
    <AppLayout
      title="Calendar"
      user={{ name: account?.name || "there", email: account?.email ?? "" }}
    >
      {children}
    </AppLayout>
  );
}
