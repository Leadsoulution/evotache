export interface BarChartDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarChartDatum[];
}

export function BarChart({ data }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No data yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5" role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      {data.map((d) => (
        <div key={d.key} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-slate-600 dark:text-slate-300" title={d.label}>
            {d.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }} />
          </div>
          <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
