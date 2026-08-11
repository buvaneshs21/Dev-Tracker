import { AlertTriangle, Flag, PlayCircle } from "lucide-react";

/** Explains the icons, so meaning never rests on colour alone. */
export default function CalendarLegend() {
  const items = [
    {
      icon: Flag,
      label: "Project deadline",
      className: "text-slate-400 dark:text-slate-500",
    },
    {
      icon: PlayCircle,
      label: "Task starts",
      className: "text-slate-400 dark:text-slate-500",
    },
    {
      icon: AlertTriangle,
      label: "Overdue",
      className: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <li key={item.label} className="inline-flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${item.className}`} aria-hidden="true" />
            {item.label}
          </li>
        );
      })}

      <li className="inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full bg-slate-400"
          aria-hidden="true"
        />
        No project
      </li>
    </ul>
  );
}
