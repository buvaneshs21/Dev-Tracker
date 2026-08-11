"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Real search, not decoration: submitting navigates to /tasks?q=… and the task
 * list filters on it server-side.
 */
export default function NavSearch({ defaultQuery = "" }: { defaultQuery?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultQuery);

  // "/" focuses search, the way it does in Linear and GitHub.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;

      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (typing) return;

      event.preventDefault();
      input.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    router.push(query ? `/tasks?q=${encodeURIComponent(query)}` : "/tasks");
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className="group hidden w-full max-w-sm items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 transition-all duration-200 focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500/20 md:flex"
    >
      <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />

      <input
        ref={input}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search tasks…"
        aria-label="Search tasks"
        className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
      />

      <kbd className="hidden shrink-0 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 lg:block">
        /
      </kbd>
    </form>
  );
}
