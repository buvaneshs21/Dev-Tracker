/**
 * Content-only: the sidebar and navbar are rendered by layout.tsx and stay put
 * while a date range loads.
 */
export default function AnalyticsLoading() {
  return (
    <div
      className="animate-pulse space-y-8"
      role="status"
      aria-label="Loading analytics"
    >
      <div className="space-y-4">
        <div className="h-9 w-44 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-9 w-28 rounded-lg bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-40 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>

      <div className="h-80 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>

      <div className="h-64 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
    </div>
  );
}
