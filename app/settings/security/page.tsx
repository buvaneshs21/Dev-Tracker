import { redirect } from "next/navigation";

import SecuritySettings from "@/components/settings/SecuritySettings";
import { getSession } from "@/lib/session";

export const metadata = { title: "Security" };

export default async function SecurityPage() {
  // Authorised by the layout too; repeated so the page is never renderable
  // without a session even if the layout changes.
  if (!(await getSession())) redirect("/login");

  return <SecuritySettings />;
}
