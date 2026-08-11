"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name — the visible title alone isn't wired to the control. */
  label: string;
  disabled?: boolean;
}

/**
 * A switch, built on a real button with role="switch" so screen readers
 * announce state and the keyboard works without extra handlers.
 */
export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900 ${
        checked
          ? "bg-indigo-600"
          : "bg-slate-200 dark:bg-slate-700"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
