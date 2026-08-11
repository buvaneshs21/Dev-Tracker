import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-hand slot: tabs, a "View all" link, a filter. */
  action?: ReactNode;
}

export default function SectionHeader({
  title,
  subtitle,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>

      {action}
    </div>
  );
}
