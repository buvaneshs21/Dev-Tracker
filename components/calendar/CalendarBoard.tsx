"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarOff, Plus } from "lucide-react";

import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import CalendarLegend from "./CalendarLegend";
import SelectedDatePanel from "./SelectedDatePanel";
import UpcomingTasks from "./UpcomingTasks";
import TaskForm, {
  EMPTY_TASK_FORM,
  type TaskFormValues,
} from "@/components/tasks/TaskForm";
import { dayKey, parseMonthParam, toDateInputValue } from "@/lib/dates";
import type {
  CalendarEvent,
  ProjectDTO,
  UpcomingTask,
  WeekStart,
} from "@/lib/types";

interface CalendarBoardProps {
  /** "YYYY-MM" — the month the server fetched events for. */
  month: string;
  events: CalendarEvent[];
  projects: ProjectDTO[];
  upcoming: UpcomingTask[];
  overdue: UpcomingTask[];
  /** From the user's preferences — drives which column the week opens on. */
  weekStartsOn: WeekStart;
}

export default function CalendarBoard({
  month,
  events,
  projects,
  upcoming,
  overdue,
  weekStartsOn,
}: CalendarBoardProps) {
  const router = useRouter();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthDate = useMemo(() => parseMonthParam(month), [month]);

  // Bucketing once here keeps every day cell from scanning the full list.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const bucket = map.get(event.dayKey);
      if (bucket) bucket.push(event);
      else map.set(event.dayKey, [event]);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedDay(dayKey(date));
  };

  const openCreate = (date: Date) => {
    // The clicked day becomes the due date — the user shouldn't retype it.
    setValues({
      ...EMPTY_TASK_FORM,
      dueDate: toDateInputValue(date.toISOString()),
    });
    setError(null);
    setCreating(true);
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.title.trim() || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not create the task.");
        return;
      }

      setCreating(false);
      setValues(EMPTY_TASK_FORM);
      // The month's events come from the server, so refetch rather than
      // splicing the new task into local state.
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <CalendarHeader month={monthDate} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4 sm:p-5">
            <CalendarGrid
              month={monthDate}
              eventsByDay={eventsByDay}
              selectedDay={selectedDay}
              onSelect={selectDate}
              weekStartsOn={weekStartsOn}
            />

            <div className="mt-4">
              <CalendarLegend />
            </div>
          </Card>

          {events.length === 0 && (
            <Card className="border-dashed">
              <EmptyState
                icon={CalendarOff}
                title="No scheduled tasks"
                message="You don't have any deadlines this month yet."
                action={
                  <button
                    type="button"
                    onClick={() => openCreate(new Date())}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create Task
                  </button>
                }
              />
            </Card>
          )}
        </div>

        <UpcomingTasks tasks={upcoming} overdue={overdue} />
      </div>

      {/* One dialog at a time: opening the create form replaces the day panel,
          and closing it brings the (refreshed) day panel back. */}
      {creating ? (
        <Modal
          open
          onClose={() => setCreating(false)}
          title="New task"
          description={
            values.dueDate
              ? "The date you picked is already set as the due date."
              : undefined
          }
        >
          <div className="flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            <TaskForm
              compact
              values={values}
              onChange={setValues}
              onSubmit={createTask}
              onCancel={() => setCreating(false)}
              saving={saving}
              submitLabel="Create Task"
              pendingLabel="Creating…"
              projects={projects}
            />
          </div>
        </Modal>
      ) : (
        selectedDate && (
          <SelectedDatePanel
            date={selectedDate}
            events={selectedEvents}
            onClose={() => {
              setSelectedDay(null);
              setSelectedDate(null);
            }}
            onAddTask={() => openCreate(selectedDate)}
          />
        )
      )}
    </div>
  );
}
