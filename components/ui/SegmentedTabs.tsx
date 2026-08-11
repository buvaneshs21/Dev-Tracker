"use client";

interface SegmentedTabsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Describes the group for screen readers, e.g. "Chart range". */
  label: string;
}

/** Compact segmented control. Generic so each caller keeps its own union type. */
export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:outline-none ${
              selected
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
