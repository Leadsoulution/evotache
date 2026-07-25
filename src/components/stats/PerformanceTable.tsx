import { cn } from "@/lib/cn";
import type { PerformanceRow } from "@/lib/taskStats";

interface PerformanceTableProps {
  title: string;
  rows: PerformanceRow[];
}

export function PerformanceTable({ title, rows }: PerformanceTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="py-2 pr-2">Name</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2 text-right">Done</th>
                <th className="px-2 py-2 text-right">Overdue</th>
                <th className="py-2 pl-2 text-right">Completion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="truncate text-slate-700 dark:text-slate-200">{row.label}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.total}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.completed}</td>
                  <td className={cn("px-2 py-2 text-right tabular-nums", row.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300")}>
                    {row.overdue}
                  </td>
                  <td className="py-2 pl-2 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">{row.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
