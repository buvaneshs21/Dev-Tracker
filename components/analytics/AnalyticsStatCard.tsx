import type { LucideIcon } from "lucide-react";

import Card from "@/components/ui/Card";

interface AnalyticsStatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  tint: string;
  /** Real supporting detail — never a fabricated trend. */
  hint: string;
}

export default function AnalyticsStatCard({
  label,
  value,
  icon: Icon,
  color,
  tint,
  hint,
}: AnalyticsStatCardProps) {
  return (
    <Card interactive className="p-6">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint} ${color}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>

        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>

      <p className="mt-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </p>

      <p className="mt-2 h-5 text-[13px] text-slate-400 dark:text-slate-500">{hint}</p>
    </Card>
  );
}
