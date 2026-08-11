"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Catches failures from the analytics aggregations — a dropped database
 * connection, mostly. Content-only: the shell comes from layout.tsx, so an
 * error doesn't strand the user with no navigation.
 *
 * The underlying error is logged server-side; the user sees a plain message,
 * never a stack trace.
 */
export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[analytics]", error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/15">
        <AlertTriangle
          className="h-6 w-6 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Couldn&apos;t load your analytics
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Something went wrong while crunching your numbers. Your data is safe —
        try again in a moment.
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900"
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
