import { Lightbulb } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import type { InsightTone, ProductivityInsight } from "@/lib/types";

const TONES: Record<InsightTone, string> = {
  positive: "border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/15 text-green-900 dark:text-green-200",
  warning: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200",
  neutral: "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300",
};

export default function ProductivityInsights({
  insights,
}: {
  insights: ProductivityInsight[];
}) {
  return (
    <Card className="p-6">
      <SectionHeader title="Insights" subtitle="Drawn from your own data" />

      {insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Not enough data yet"
          message="Complete a few tasks and insights about your habits will show up here."
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${TONES[insight.tone]}`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {insight.icon}
              </span>
              <span>{insight.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
