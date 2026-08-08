"use client";

import { Avatar } from "@/components/ui/Avatar";
import { PencilIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { BiometricEmployee } from "@/lib/biometricStats";

interface BiometricEmployeeSelectorBarProps {
  employees: BiometricEmployee[];
  selectedEmpCode: string | null;
  onSelect: (empCode: string | null) => void;
  /** Omit to hide the "Gérer" button entirely (e.g. for a view-only granted user who isn't a manager/admin). */
  onManage?: () => void;
}

/** Mirrors ThreeCxUserSelectorBar's (src/components/calls/ThreeCxUserSelectorBar.tsx)
 * avatar-row, single-select pattern for the Calls page — same Avatar
 * component (using each employee's own color) — but for biometric
 * employees. The "Gérer" button stays reachable even when every employee
 * is currently hidden, so hiding everyone can't lock the admin out of
 * restoring them. */
export function BiometricEmployeeSelectorBar({ employees, selectedEmpCode, onSelect, onManage }: BiometricEmployeeSelectorBarProps) {
  const visibleEmployees = employees.filter((e) => !e.hidden);
  if (employees.length === 0) return null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer par employé">
        <button
          type="button"
          role="tab"
          aria-selected={selectedEmpCode === null}
          onClick={() => onSelect(null)}
          className={cn(
            "flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
            selectedEmpCode === null ? "bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950 dark:ring-indigo-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white dark:ring-slate-900",
              selectedEmpCode === null ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
            )}
          >
            Tous
          </span>
          <span
            className={cn(
              "max-w-[72px] truncate text-xs font-medium",
              selectedEmpCode === null ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"
            )}
          >
            Tout le monde
          </span>
        </button>

        {visibleEmployees.length === 0 && <span className="px-1 text-xs text-slate-400">Tous les employés sont masqués.</span>}

        {visibleEmployees.map((e) => {
          const selected = selectedEmpCode === e.empCode;
          return (
            <button
              key={e.empCode}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(selected ? null : e.empCode)}
              className={cn(
                "flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
                selected ? "bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950 dark:ring-indigo-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Avatar name={e.name} color={e.color} size="md" className={cn(selected && "ring-2 ring-indigo-500")} />
              <span
                className={cn("max-w-[72px] truncate text-xs font-medium", selected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400")}
                title={`${e.name} (${e.empCode})`}
              >
                {e.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
      {onManage && (
        <button
          type="button"
          onClick={onManage}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Gérer
        </button>
      )}
    </div>
  );
}
