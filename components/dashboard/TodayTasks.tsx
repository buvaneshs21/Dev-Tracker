"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, PartyPopper } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/common/StatusPill";
import PriorityBadge from "@/components/common/PriorityBadge";
import DueDate from "@/components/common/DueDate";
import type { TaskDTO } from "@/lib/types";

export default function TodayTasks({ tasks }: { tasks: TaskDTO[] }) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [busyId, setBusyId] = useState<string | null>(null);

  const complete = async (id: string) => {
    setBusyId(id);

    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    if (res.status === 401) {
      router.replace("/login");
      router.refresh();
      return;
    }

    if (res.ok) {
      // This panel lists open work, so a completed task leaves it.
      setItems((prev) => prev.filter((task) => task.id !== id));
      router.refresh();
    }

    setBusyId(null);
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="Today's tasks"
        subtitle="Soonest deadlines first"
        action={
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-700 dark:hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="No pending tasks 🎉"
          message="Enjoy your day — everything on your list is done."
          action={
            <Link
              href="/tasks?new=1"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
            >
              Add a task
            </Link>
          }
        />
      ) : (
        <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((task) => {
            const busy = busyId === task.id;

            return (
              <li
                key={task.id}
                className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0"
              >
                <button
                  type="button"
                  onClick={() => complete(task.id)}
                  disabled={busy}
                  aria-label={`Mark "${task.title}" complete`}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 text-transparent transition-all duration-200 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/15 hover:text-green-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400 dark:text-slate-500" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {task.title}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <StatusPill status={task.status} />
                    <DueDate value={task.dueDate} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
