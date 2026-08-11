/** Keeps the panel area from going blank while a section's data loads. */
export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-4 w-64 rounded bg-slate-200 dark:bg-slate-800" />

        <div className="mt-8 space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
