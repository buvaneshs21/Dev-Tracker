import Link from "next/link";
import { Plus } from "lucide-react";

interface DashboardHeaderProps {
  name: string;
  total: number;
  open: number;
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHeader({
  name,
  total,
  open,
}: DashboardHeaderProps) {
  const now = new Date();

  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subline =
    total === 0
      ? "Create your first task and it'll show up right here."
      : open === 0
        ? "Everything's done. Enjoy the quiet."
        : `Let's finish your ${open} remaining task${open === 1 ? "" : "s"} today.`;

  return (
    <section className="flex flex-wrap items-start justify-between gap-6">
      <div>
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          {greetingFor(now.getHours())} 👋
        </p>

        <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-[40px] lg:leading-[1.15]">
          Welcome back, {name}
        </h2>

        <p className="mt-3 text-slate-500 dark:text-slate-400">{subline}</p>

        <p className="mt-1 text-[13px] text-slate-400 dark:text-slate-500">
          {today} · {total} task{total === 1 ? "" : "s"} tracked
        </p>
      </div>

      <Link
        href="/tasks?new=1"
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New Task
      </Link>
    </section>
  );
}
