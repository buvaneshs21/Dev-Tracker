/**
 * Content-only: the sidebar and navbar are rendered by layout.tsx and stay put
 * while a month loads.
 */
export default function CalendarLoading() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Loading calendar">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-9 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-64 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-56 rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 49 }).map((_, index) => (
              <div
                key={index}
                className={`rounded bg-slate-100 dark:bg-slate-800 ${
                  index < 7 ? "h-8" : "h-20 sm:h-28"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
