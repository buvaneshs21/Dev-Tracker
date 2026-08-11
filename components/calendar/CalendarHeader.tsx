import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { addMonths, formatMonthLabel, toMonthParam } from "@/lib/dates";

/**
 * Month navigation is a set of links rather than client state: the events for a
 * month are fetched on the server, so the URL is what selects them. That also
 * makes a month shareable and the back button work.
 */
export default function CalendarHeader({ month }: { month: Date }) {
  const previous = toMonthParam(addMonths(month, -1));
  const next = toMonthParam(addMonths(month, 1));

  const control =
    "inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Calendar
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Manage your tasks and deadlines.</p>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {formatMonthLabel(month)}
        </p>

        <div className="flex items-center gap-1.5">
          <Link
            href={`/calendar?month=${previous}`}
            aria-label="Previous month"
            className={`${control} w-9 px-0`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link href="/calendar" aria-label="Go to today" className={control}>
            Today
          </Link>

          <Link
            href={`/calendar?month=${next}`}
            aria-label="Next month"
            className={`${control} w-9 px-0`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
