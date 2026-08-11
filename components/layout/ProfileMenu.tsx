"use client";

import { ChevronDown } from "lucide-react";

import Dropdown from "@/components/ui/Dropdown";
import LogoutButton from "./LogoutButton";

interface ProfileMenuProps {
  user: { name: string; email: string };
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <Dropdown
      label="Account menu"
      triggerClassName="flex items-center gap-2 rounded-xl py-1.5 pr-2 pl-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
      panelClassName="w-60 p-2"
      trigger={
        <>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {initial}
          </span>
          <span className="hidden max-w-[9rem] truncate text-sm font-medium text-slate-700 dark:text-slate-300 md:block">
            {user.name}
          </span>
          <ChevronDown
            className="hidden h-4 w-4 text-slate-400 dark:text-slate-500 md:block"
            aria-hidden="true"
          />
        </>
      }
    >
      <div className="border-b border-slate-100 dark:border-slate-800 px-3 pt-2 pb-3">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {user.name}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
      </div>

      <div className="pt-2">
        <LogoutButton variant="menu-item" />
      </div>
    </Dropdown>
  );
}
