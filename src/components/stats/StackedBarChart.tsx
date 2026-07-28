import { niceTicks } from "@/lib/chartScale";
import type { BarChartDatum } from "./BarChart";

interface StackedBarChartProps {
  data: BarChartDatum[];
  unitLabel?: string;
}

export function StackedBarChart({ data, unitLabel = "Tasks" }: StackedBarChartProps) {
  const visible = data.filter((d) => d.value > 0);
  const total = visible.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <p className="text-sm text-slate-400">No data yet.</p>;
  }

  const { ticks, max } = niceTicks(total, 6);

  return (
    <div className="flex flex-col gap-5" role="img" aria-label={`Stacked bar chart: ${visible.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <div>
        <div className="relative flex h-8 w-full gap-0.5 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
          {visible.map((d) => (
            <div key={d.key} className="h-full" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }} title={`${d.label}: ${d.value}`} />
          ))}
          {ticks.map((tick) => (
            <span
              key={tick}
              className="pointer-events-none absolute top-0 h-full w-px bg-white/70 dark:bg-slate-950/40"
              style={{ left: `${(tick / max) * 100}%` }}
            />
          ))}
        </div>
        <div className="relative mt-1.5 h-4 text-[10px] text-slate-400">
          {ticks.map((tick) => (
            <span key={tick} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(tick / max) * 100}%` }}>
              {tick}
            </span>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">{unitLabel}</p>
      </div>

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
