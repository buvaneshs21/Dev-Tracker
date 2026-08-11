"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  /** "button" for standalone use, "menu-item" inside a dropdown panel. */
  variant?: "button" | "menu-item";
}

export default function LogoutButton({
  variant = "button",
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });

    // refresh() drops the cached server render, otherwise the dashboard can
    // flash back before the proxy notices the cleared cookie.
    router.replace("/login");
    router.refresh();
  };

  const className =
    variant === "menu-item"
      ? "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400"
      : "inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100";

  return (
    <button
      type="button"
      role={variant === "menu-item" ? "menuitem" : undefined}
      onClick={handleLogout}
      disabled={loading}
      className={`${className} focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className={variant === "button" ? "hidden sm:inline" : ""}>
        {loading ? "Signing out…" : "Sign out"}
      </span>
    </button>
  );
}
