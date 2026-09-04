"use client";

import { useMemo, useState } from "react";
import { SheetIcon } from "@/components/ui/icons";
import { BiometricSectionTitle } from "./BiometricSectionTitle";
import { casablancaDateKey } from "@/lib/casablancaTime";
import { computeEmployeeMonthGrid, formatShortDuration, resolveEmployeeSchedule } from "@/lib/biometricStats";
import { cn } from "@/lib/cn";
import type { BiometricEmployee } from "@/lib/biometricStats";
import type { BiometricEvent, BiometricHoliday, BiometricLeave, BiometricSchedule } from "@/types/biometric";

interface BiometricMonthlyGridProps {
  events: BiometricEvent[];
  employees: BiometricEmployee[];
  leaves: BiometricLeave[];
  holidays: BiometricHoliday[];
  defaultSchedule: BiometricSchedule;
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
}

const ROW_LABEL_CLASS =
  "sticky left-0 z-10 whitespace-nowrap border-r border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";

/** One employee's month, one column per calendar day — "retard" / "temps de
 * pause" / "absence", switchable between employees via the dropdown (this
 * table only ever shows one person at a time, unlike the rest of the page's
 * all-employees tables). Reuses computeEmployeeMonthGrid, so a day already
 * excluded elsewhere (leave, holiday, Saturday off) reads as "not absent"
 * here too instead of just being blank. */
export function BiometricMonthlyGrid({ events, employees, leaves, holidays, defaultSchedule, monthKey, onMonthChange }: BiometricMonthlyGridProps) {
  const visibleEmployees = useMemo(() => employees.filter((e) => !e.hidden), [employees]);
  const [empCode, setEmpCode] = useState<string | null>(null);
  const selected = visibleEmployees.find((e) => e.empCode === empCode) ?? visibleEmployees[0] ?? null;

  const cells = useMemo(() => {
    if (!selected) return [];
    const schedule = resolveEmployeeSchedule(selected, defaultSchedule);
    return computeEmployeeMonthGrid(events, selected, leaves, holidays, schedule, monthKey, casablancaDateKey(new Date()));
  }, [events, selected, leaves, holidays, defaultSchedule, monthKey]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <BiometricSectionTitle icon={<SheetIcon className="h-5 w-5 text-sky-500" />}>Détail par jour</BiometricSectionTitle>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Retard, temps de pause et absence, jour par jour — un salarié à la fois</p>
        </div>
        <div className="flex items-center gap-2">
          {selected && (
            <select
              value={selected.empCode}
              onChange={(e) => setEmpCode(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
            >
              {visibleEmployees.map((e) => (
                <option key={e.empCode} value={e.empCode}>
                  {e.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="month"
            value={monthKey}
            onChange={(e) => e.target.value && onMonthChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
          />
        </div>
      </div>

      {!selected ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">Aucun employé à afficher.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th scope="col" className={ROW_LABEL_CLASS}>
                  Nom de salarié
                </th>
                {cells.map((cell) => (
                  <th
                    key={cell.day}
                    scope="col"
                    className="min-w-[3.25rem] whitespace-nowrap bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-500 dark:bg-slate-800/40 dark:text-slate-400"
                  >
                    {cell.day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className={ROW_LABEL_CLASS}>Retard</td>
                {cells.map((cell) => (
                  <td
                    key={cell.day}
                    className={cn("px-2 py-2 text-center tabular-nums", cell.lateSeconds > 0 ? "font-medium text-amber-600 dark:text-amber-400" : "text-slate-400")}
                  >
                    {formatShortDuration(cell.lateSeconds)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className={ROW_LABEL_CLASS}>Temps de pause</td>
                {cells.map((cell) => (
                  <td
                    key={cell.day}
                    className={cn("px-2 py-2 text-center tabular-nums", cell.pauseSeconds > 0 ? "font-medium text-sky-600 dark:text-sky-400" : "text-slate-400")}
                  >
                    {formatShortDuration(cell.pauseSeconds)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={ROW_LABEL_CLASS}>Absence</td>
                {cells.map((cell) => (
                  <td key={cell.day} className={cn("px-2 py-2 text-center", cell.isAbsent ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-400")}>
                    {cell.isAbsent ? "Oui" : "-"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
