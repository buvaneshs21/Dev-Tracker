import type { ProjectColor } from "@/lib/types";
import { PROJECT_COLOR_CLASSES } from "./project-colors";

interface ProjectProgressProps {
  /** 0–100, already rounded. */
  percent: number;
  color: ProjectColor;
  /** Hides the "x% complete" caption when the caller renders its own. */
  showLabel?: boolean;
}

export default function ProjectProgress({
  percent,
  color,
  showLabel = true,
}: ProjectProgressProps) {
  const safe = Math.max(0, Math.min(100, percent));

  return (
    <div>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-300">{safe}% complete</span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${safe} percent complete`}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${PROJECT_COLOR_CLASSES[color].bar}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}
