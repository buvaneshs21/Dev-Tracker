"use client";

import { useState } from "react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import type { ProductivitySeries, SeriesRange } from "@/lib/tasks";

// Colours come from the shared chart variables so they flip with the theme.
// Both the light and dark steps were validated against their own surface — see
// globals.css. The gradient stays inside one hue: it's surface decoration, not
// a second encoding, and the bar's height alone carries the value.
import {
  CHART_AXIS_TEXT,
  CHART_GRID,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_FG,
  PRODUCTIVITY_COLOR,
  PRODUCTIVITY_COLOR_SOFT,
} from "@/components/analytics/chart-colors";

const W = 560;
const H = 210;
const PAD = { top: 16, right: 8, bottom: 30, left: 30 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const MAX_BAR = 26; // never fill the band — the leftover is air
const RADIUS = 4; // rounded data-end, square at the baseline

const RANGES: { value: SeriesRange; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const CAPTIONS: Record<SeriesRange, string> = {
  daily: "Last 7 days",
  weekly: "Last 8 weeks",
  monthly: "Last 6 months",
};

/** Round the axis top to a clean number so ticks stay integers. */
function niceMax(max: number): number {
  if (max <= 4) return Math.max(1, max);
  if (max <= 10) return Math.ceil(max / 2) * 2;
  return Math.ceil(max / 5) * 5;
}

function ticksFor(max: number): number[] {
  if (max <= 2) return Array.from({ length: max + 1 }, (_, i) => i);
  return [0, Math.round(max / 2), max];
}

/** Rounded only at the top; the baseline end stays square. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  return [
    `M${x},${y + h}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + w - r},${y}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `L${x + w},${y + h}`,
    "Z",
  ].join(" ");
}

export default function ProductivityChart({
  series,
}: {
  series: ProductivitySeries;
}) {
  const [range, setRange] = useState<SeriesRange>("daily");
  const [active, setActive] = useState<number | null>(null);

  const data = series[range];
  const total = data.reduce((sum, point) => sum + point.count, 0);
  const best = data.reduce(
    (max, point) => (point.count > max.count ? point : max),
    data[0],
  );
  const average = total / Math.max(data.length, 1);

  const top = niceMax(Math.max(...data.map((point) => point.count), 0));
  const band = PLOT_W / data.length;
  const barWidth = Math.min(MAX_BAR, band - 14);

  const xOf = (i: number) => PAD.left + band * i + (band - barWidth) / 2;
  const yOf = (count: number) => PAD.top + PLOT_H - (count / top) * PLOT_H;

  return (
    <Card className="p-6">
      <SectionHeader
        title="Productivity"
        subtitle={CAPTIONS[range]}
        action={
          <SegmentedTabs
            label="Chart range"
            options={RANGES}
            value={range}
            onChange={setRange}
          />
        }
      />

      <div className="relative mt-6">
        <svg
          key={range}
          viewBox={`0 0 ${W} ${H}`}
          className="fade-up h-auto w-full"
          role="img"
          aria-label={`Tasks completed, ${CAPTIONS[range].toLowerCase()}. ${total} in total.`}
        >
          <defs>
            <linearGradient id="devtrack-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: PRODUCTIVITY_COLOR }} />
              <stop offset="100%" style={{ stopColor: PRODUCTIVITY_COLOR_SOFT }} />
            </linearGradient>
          </defs>

          {ticksFor(top).map((tick) => {
            const y = yOf(tick);
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  style={{ stroke: CHART_GRID }}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  style={{ fill: CHART_AXIS_TEXT, fontVariantNumeric: "tabular-nums" }}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {data.map((point, i) => {
            const height = (point.count / top) * PLOT_H;
            const x = xOf(i);
            const isActive = active === i;

            return (
              <g key={point.key}>
                {point.count > 0 && (
                  <path
                    d={barPath(x, yOf(point.count), barWidth, height)}
                    fill="url(#devtrack-bar)"
                    opacity={active === null || isActive ? 1 : 0.4}
                    className="transition-opacity duration-200"
                  />
                )}

                <text
                  x={x + barWidth / 2}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={11}
                  style={{ fill: CHART_AXIS_TEXT }}
                >
                  {point.label}
                </text>

                {/* Hit target spans the whole band, not just the bar. */}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                />
              </g>
            );
          })}

          {active !== null &&
            (() => {
              const point = data[active];
              const label = `${point.label} · ${point.count} done`;
              const boxWidth = Math.max(92, label.length * 6.2);
              const cx = xOf(active) + barWidth / 2;
              // Clamp so the tooltip never runs off either edge.
              const bx = Math.min(
                Math.max(cx - boxWidth / 2, PAD.left),
                W - PAD.right - boxWidth,
              );
              const by = Math.max(yOf(point.count) - 34, 2);

              return (
                <g pointerEvents="none">
                  <rect
                    x={bx}
                    y={by}
                    width={boxWidth}
                    height={26}
                    rx={8}
                    style={{ fill: CHART_TOOLTIP_BG }}
                  />
                  <text
                    x={bx + boxWidth / 2}
                    y={by + 17}
                    textAnchor="middle"
                    fontSize={11}
                    style={{ fill: CHART_TOOLTIP_FG }}
                  >
                    {label}
                  </text>
                </g>
              );
            })()}
        </svg>

        {total === 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            No completed tasks in this period
          </p>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Completed</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{total}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Best</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {best?.count ?? 0}
            <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
              {best && best.count > 0 ? best.label : ""}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Average</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {average.toFixed(1)}
          </dd>
        </div>
      </dl>

      {/* Table view — values never depend on reading the chart alone. */}
      <table className="sr-only">
        <caption>Tasks completed, {CAPTIONS[range]}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Completed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
