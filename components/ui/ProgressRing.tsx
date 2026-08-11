interface ProgressRingProps {
  /** 0–100. */
  percent: number;
  size?: number;
  stroke?: number;
  /** Stroke colour for the filled arc. */
  color?: string;
  label: string;
  caption: string;
}

const TRACK = "var(--ring-track)";

export default function ProgressRing({
  percent,
  size = 148,
  stroke = 12,
  color = "var(--goal-accent)",
  label,
  caption,
}: ProgressRingProps) {
  const safe = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (safe / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={`${label} complete. ${caption}.`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke: TRACK }}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke: color }}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{label}</span>
      </div>
    </div>
  );
}
