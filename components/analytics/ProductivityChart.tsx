"use client";

import { useState } from "react";
import { LineChart } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import {
  CHART_AXIS_TEXT,
  CHART_GRID,
  CHART_SURFACE,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_FG,
  PRODUCTIVITY_COLOR,
} from "./chart-colors";
import type { AnalyticsData, ProductivityPoint } from "@/lib/types";

const W = 720;
const H = 260;
const PAD = { top: 18, right: 12, bottom: 34, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const GRANULARITY_LABEL: Record<AnalyticsData["granularity"], string> = {
  day: "Completed tasks per day",
  week: "Completed tasks per week",
  month: "Completed tasks per month",
};

function niceMax(max: number): number {
  if (max <= 4) return Math.max(1, max);
  if (max <= 10) return Math.ceil(max / 2) * 2;
  return Math.ceil(max / 5) * 5;
}

function ticksFor(max: number): number[] {
  if (max <= 2) return Array.from({ length: max + 1 }, (_, i) => i);
  return [0, Math.round(max / 2), max];
}

type Point = { x: number; y: number };

/**
 * Catmull-Rom smoothing. Control points are clamped to the plot box because an
 * unclamped spline overshoots on spiky data and would draw the area below its
 * own baseline — which reads as negative completions.
 */
function smoothPath(points: Point[], top: number, bottom: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  const clamp = (y: number) => Math.min(bottom, Math.max(top, y));
  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1 = { x: p1.x + (p2.x - p0.x) / 6, y: clamp(p1.y + (p2.y - p0.y) / 6) };
    const cp2 = { x: p2.x - (p3.x - p1.x) / 6, y: clamp(p2.y - (p3.y - p1.y) / 6) };

    d += ` C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
  }

  return d;
}

interface ProductivityChartProps {
  data: ProductivityPoint[];
  granularity: AnalyticsData["granularity"];
}

export default function ProductivityChart({
  data,
  granularity,
}: ProductivityChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const total = data.reduce((sum, point) => sum + point.count, 0);
  const top = niceMax(Math.max(...data.map((point) => point.count), 0));

  const step = data.length > 1 ? PLOT_W / (data.length - 1) : 0;
  const xOf = (i: number) =>
    data.length > 1 ? PAD.left + step * i : PAD.left + PLOT_W / 2;
  const yOf = (count: number) => PAD.top + PLOT_H - (count / top) * PLOT_H;

  const points: Point[] = data.map((point, i) => ({
    x: xOf(i),
    y: yOf(point.count),
  }));

  const line = smoothPath(points, PAD.top, PAD.top + PLOT_H);
  const area =
    points.length > 0
      ? `${line} L${points[points.length - 1].x},${PAD.top + PLOT_H} L${points[0].x},${PAD.top + PLOT_H} Z`
      : "";

  // Thin the x labels so they never collide.
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <Card className="p-6">
      <SectionHeader
        title="Productivity"
        subtitle={GRANULARITY_LABEL[granularity]}
        action={
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{total}</span>{" "}
            completed
          </p>
        }
      />

      {data.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="Nothing to plot yet"
          message="Complete a task and your productivity will appear here."
        />
      ) : (
        <div className="relative mt-6">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="fade-up h-auto w-full"
            role="img"
            aria-label={`${GRANULARITY_LABEL[granularity]}. ${total} completed in this period.`}
          >
            <defs>
              <linearGradient id="devtrack-area" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  style={{ stopColor: PRODUCTIVITY_COLOR, stopOpacity: 0.18 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: PRODUCTIVITY_COLOR, stopOpacity: 0.01 }}
                />
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
                    x={PAD.left - 10}
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

            {area && <path d={area} fill="url(#devtrack-area)" />}
            {line && (
              <path
                d={line}
                fill="none"
                style={{ stroke: PRODUCTIVITY_COLOR }}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {data.map((point, i) => (
              <text
                key={`label-${point.key}`}
                x={xOf(i)}
                y={H - 12}
                textAnchor="middle"
                fontSize={11}
                style={{ fill: CHART_AXIS_TEXT }}
                opacity={i % labelEvery === 0 ? 1 : 0}
              >
                {point.label}
              </text>
            ))}

            {active !== null && (
              <>
                <line
                  x1={xOf(active)}
                  x2={xOf(active)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_H}
                  style={{ stroke: CHART_GRID }}
                  strokeWidth={1}
                />
                {/* 2px surface ring keeps the marker legible over the line. */}
                <circle
                  cx={xOf(active)}
                  cy={yOf(data[active].count)}
                  r={5}
                  style={{ fill: PRODUCTIVITY_COLOR, stroke: CHART_SURFACE }}
                  strokeWidth={2}
                />
              </>
            )}

            {/* Hit targets span the full band height, not just the line. */}
            {data.map((point, i) => (
              <rect
                key={`hit-${point.key}`}
                x={xOf(i) - (step || PLOT_W) / 2}
                y={PAD.top}
                width={step || PLOT_W}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            ))}

            {active !== null &&
              (() => {
                const point = data[active];
                const text = `${point.label} · ${point.count}`;
                const boxWidth = Math.max(88, text.length * 6.4);
                const bx = Math.min(
                  Math.max(xOf(active) - boxWidth / 2, PAD.left),
                  W - PAD.right - boxWidth,
                );
                const by = Math.max(yOf(point.count) - 36, 2);

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
                      {text}
                    </text>
                  </g>
                );
              })()}
          </svg>

          {total === 0 && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              No tasks completed in this period
            </p>
          )}
        </div>
      )}

      {/* Table view — values never depend on reading the chart alone. */}
      <table className="sr-only">
        <caption>{GRANULARITY_LABEL[granularity]}</caption>
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
