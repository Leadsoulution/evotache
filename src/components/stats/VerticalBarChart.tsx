import { niceTicks } from "@/lib/chartScale";
import type { BarChartDatum } from "./BarChart";

interface VerticalBarChartProps {
  data: BarChartDatum[];
  unitLabel?: string;
}

const CHART_HEIGHT = 160;

export function VerticalBarChart({ data, unitLabel = "Tasks" }: VerticalBarChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No data yet.</p>;
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const { ticks, max } = niceTicks(maxValue, 5);

  return (
    <div className="flex flex-col gap-4" role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <div className="flex gap-2">
        <div className="flex shrink-0 flex-col justify-between text-[10px] text-slate-400" style={{ height: CHART_HEIGHT }}>
          {[...ticks].reverse().map((tick) => (
            <span key={tick} className="tabular-nums">
              {tick}
            </span>
          ))}
        </div>
        <div className="relative flex flex-1 items-end gap-2 border-l border-slate-200 pl-2 dark:border-slate-800" style={{ height: CHART_HEIGHT }}>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-100 dark:border-slate-800/70"
              style={{ bottom: `${(tick / max) * 100}%` }}
            />
          ))}
          {data.map((d) => (
            <div key={d.key} className="relative flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full max-w-8 rounded-t-md transition-all"
                style={{ height: `${max > 0 ? (d.value / max) * 100 : 0}%`, backgroundColor: d.color }}
                title={`${d.label}: ${d.value}`}
              />
              <span className="w-full truncate text-center text-[10px] text-slate-400" title={d.label}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">{unitLabel}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <span key={d.key} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
