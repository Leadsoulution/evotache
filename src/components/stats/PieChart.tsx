"use client";

import { useMemo } from "react";
import type { BarChartDatum } from "./BarChart";

interface PieChartProps {
  data: BarChartDatum[];
  centerLabel?: string;
}

const SIZE = 160;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Segment {
  datum: BarChartDatum;
  dash: number;
  gap: number;
  offset: number;
  fraction: number;
}

export function PieChart({ data, centerLabel }: PieChartProps) {
  const visible = data.filter((d) => d.value > 0);
  const total = visible.reduce((sum, d) => sum + d.value, 0);

  const segments = useMemo(() => {
    let cumulative = 0;
    const result: Segment[] = [];
    for (const datum of visible) {
      const fraction = total > 0 ? datum.value / total : 0;
      const dash = fraction * CIRCUMFERENCE;
      result.push({ datum, dash, gap: CIRCUMFERENCE - dash, offset: -cumulative * CIRCUMFERENCE, fraction });
      cumulative += fraction;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, total]);

  if (total === 0) {
    return <p className="text-sm text-slate-400">No data yet.</p>;
  }

  return (
    <div
      className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center"
      role="img"
      aria-label={`Pie chart: ${visible.map((d) => `${d.label} ${Math.round((d.value / total) * 100)}%`).join(", ")}`}
    >
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-slate-100 dark:stroke-slate-800" />
          {segments.map(({ datum, dash, gap, offset, fraction }) => (
            <circle
              key={datum.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={datum.color}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
            >
              <title>{`${datum.label}: ${datum.value} (${Math.round(fraction * 100)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-400">{centerLabel ?? "Total"}</span>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto">
        {visible.map((d) => (
          <div key={d.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300" title={d.label}>
              {d.label}
            </span>
            <span className="shrink-0 tabular-nums font-medium text-slate-700 dark:text-slate-200">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
