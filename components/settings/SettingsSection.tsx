import { ReactNode } from "react";

import Card from "@/components/ui/Card";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  /** Red framing for destructive sections. */
  tone?: "default" | "danger";
}

/** Consistent heading + surface for every settings panel. */
export default function SettingsSection({
  title,
  description,
  children,
  tone = "default",
}: SettingsSectionProps) {
  if (tone === "danger") {
    return (
      <div className="card-padded rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/30 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-red-700 dark:text-red-300">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
        <div className="mt-6">{children}</div>
      </div>
    );
  }

  return (
    <Card className="card-padded p-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <div className="mt-6">{children}</div>
    </Card>
  );
}
