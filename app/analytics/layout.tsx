import { ReactNode } from "react";
import { redirect } from "next/navigation";

import AppLayout from "@/components/layout/AppLayout";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";

type Account = { name?: string; email?: string } | null;

/**
 * Holds the shell so `loading.tsx` and `error.tsx` only replace the content
 * column — changing the date range shouldn't blank the sidebar.
 */
export default async function AnalyticsLayout({
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
      title="Analytics"
      user={{ name: account?.name || "there", email: account?.email ?? "" }}
    >
      {children}
    </AppLayout>
  );
}
