import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  /** Adds lift-on-hover. Only for cards that are themselves actionable. */
  interactive?: boolean;
  className?: string;
}

/**
 * The single surface primitive. Every panel on an authenticated page is a Card
 * so radius, border and shadow stay identical across the app.
 */
export default function Card({
  children,
  interactive = false,
  className = "",
}: CardProps) {
  return (
    <div
      // card-padded is the hook compact mode tightens; see globals.css.
      className={`card-padded rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${
        interactive
          ? "transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
