"use client";

import Link from "next/link";
import { CalendarOff, ChevronRight, Flag, Plus } from "lucide-react";

import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/common/StatusPill";
import PriorityBadge from "@/components/common/PriorityBadge";
import { colorClassesFor } from "@/components/projects/project-colors";
import { formatDayLabel } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/types";

interface SelectedDatePanelProps {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onAddTask: () => void;
}

export default function SelectedDatePanel({
  date,
  events,
  onClose,
  onAddTask,
}: SelectedDatePanelProps) {
  const tasks = events.filter((event) => event.type === "task");
  const deadlines = events.filter((event) => event.type === "project");

  return (
    <Modal open onClose={onClose} title={formatDayLabel(date)}>
      <div className="flex flex-col gap-6">
        {events.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarOff}
            title="No scheduled tasks"
            message="You don't have any deadlines on this day yet."
          />
        ) : (
          <>
            {tasks.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tasks</h3>

                <ul className="mt-3 space-y-2">
                  {tasks.map((event) => (
                    <li key={event.id}>
                      <Link
                        href={`/tasks/${event.taskId}`}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50/40 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                            event.overdue
                              ? "bg-red-500"
                              : colorClassesFor(event.projectColor).dot
                          }`}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {event.title}
                            </span>
                            {event.kind === "start" && (
                              <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                                Starts
                              </span>
                            )}
                          </span>

                          <span className="mt-2 flex flex-wrap items-center gap-2">
                            {event.overdue && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-500/30 ring-inset">
                                Overdue
                              </span>
                            )}
                            {event.priority && (
                              <PriorityBadge priority={event.priority} />
                            )}
                            {event.status && <StatusPill status={event.status} />}
                            {event.projectName && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {event.projectName}
                              </span>
                            )}
                          </span>
                        </span>

                        <ChevronRight
                          className="mt-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {deadlines.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Project deadlines
                </h3>

                <ul className="mt-3 space-y-2">
                  {deadlines.map((event) => (
                    <li key={event.id}>
                      <Link
                        href={`/projects/${event.projectId}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50/40 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClassesFor(event.projectColor).dot}`}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {event.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Flag className="h-3 w-3" aria-hidden="true" />
                            Project deadline
                          </span>
                        </span>

                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onAddTask}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Task
        </button>
      </div>
    </Modal>
  );
}
