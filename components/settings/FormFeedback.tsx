import { AlertCircle, CheckCircle2 } from "lucide-react";

export type Feedback = { tone: "success" | "error"; message: string } | null;

/**
 * Inline success/error banner.
 *
 * The app has no toast system, and every existing form reports this way, so
 * settings follows suit rather than introducing a second feedback pattern.
 */
export default function FormFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  const success = feedback.tone === "success";
  const Icon = success ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${
        success
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-200"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{feedback.message}</span>
    </div>
  );
}
