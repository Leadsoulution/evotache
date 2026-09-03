"use client";

import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PencilIcon } from "@/components/ui/icons";
import { BiometricPayrollRulesEditor } from "./BiometricPayrollRulesEditor";
import { formatDirham, formatLateDuration } from "@/lib/biometricStats";
import type { PayrollRow } from "@/lib/biometricStats";
import type { BiometricLatePenaltyRule } from "@/types/biometric";

interface BiometricPayrollSectionProps {
  rows: PayrollRow[];
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  absenceDeduction: number;
  rules: BiometricLatePenaltyRule[];
  onSaveSalary: (empCode: string, salary: number | null) => Promise<void>;
  onSaveAbsenceDeduction: (amount: number) => Promise<void>;
  onAddRule: (fromMinutes: number, amount: number) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

/** Payroll for one month: each employee's gross pay minus what their
 * lateness and absences cost under the configured rules. Deliberately
 * rendered only for managers/admins (the API refuses it for anyone else) —
 * salary is the one thing on this page a view-only attendance user must not
 * see. */
export function BiometricPayrollSection({
  rows,
  monthKey,
  onMonthChange,
  absenceDeduction,
  rules,
  onSaveSalary,
  onSaveAbsenceDeduction,
  onAddRule,
  onDeleteRule,
}: BiometricPayrollSectionProps) {
  const [editingRules, setEditingRules] = useState(false);

  const totals = rows.reduce(
    (acc, row) => ({
      salary: acc.salary + (row.monthlySalary ?? 0),
      deduction: acc.deduction + row.totalDeduction,
      net: acc.net + (row.netSalary ?? 0),
    }),
    { salary: 0, deduction: 0, net: 0 }
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Salaires</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Salaire mensuel moins les retards et les absences du mois</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={monthKey}
            onChange={(e) => e.target.value && onMonthChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
          />
          <button
            type="button"
            onClick={() => setEditingRules(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Regles
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">Aucun employe a afficher.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="whitespace-nowrap px-4 py-2">Salarie</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Salaire (DH)</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Retards</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Absences</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Deductions</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Net a payer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.empCode} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-4 py-2">
                    <span className="flex items-center gap-2">
                      <Avatar name={row.name} color={row.color} size="sm" />
                      <span className="font-medium text-slate-800 dark:text-slate-100">{row.name}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <SalaryInput empCode={row.empCode} value={row.monthlySalary} onSave={onSaveSalary} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.lateDays === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200">
                        <span className="font-medium tabular-nums">{row.lateDays}</span> j
                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({formatLateDuration(row.lateSeconds)})</span>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.absenceDays === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="font-medium tabular-nums text-red-600 dark:text-red-400">{row.absenceDays} j</span>
                    )}
                    {row.leaveDays > 0 && <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">+{row.leaveDays} j conge</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.totalDeduction === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="font-medium tabular-nums text-red-600 dark:text-red-400" title={`Retards ${formatDirham(row.lateDeduction)} · Absences ${formatDirham(row.absenceDeduction)}`}>
                        -{formatDirham(row.totalDeduction)}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.netSalary === null ? (
                      <span className="text-xs text-slate-400">Salaire a definir</span>
                    ) : (
                      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatDirham(row.netSalary)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800/40">
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">Total</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700 dark:text-slate-200">{formatDirham(totals.salary)}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-red-600 dark:text-red-400">
                  {totals.deduction === 0 ? "—" : `-${formatDirham(totals.deduction)}`}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-800 dark:text-slate-100">{formatDirham(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <BiometricPayrollRulesEditor
        open={editingRules}
        absenceDeduction={absenceDeduction}
        rules={rules}
        onClose={() => setEditingRules(false)}
        onSaveAbsenceDeduction={onSaveAbsenceDeduction}
        onAddRule={onAddRule}
        onDeleteRule={onDeleteRule}
      />
    </section>
  );
}

/** Inline salary cell — committed on blur/Enter rather than per keystroke,
 * same as the employee rename field in the Gerer modal, so the whole payroll
 * table doesn't recompute (and PATCH) on every digit typed. An emptied field
 * clears the salary back to "not set" instead of saving 0. */
function SalaryInput({ empCode, value, onSave }: { empCode: string; value: number | null; onSave: (empCode: string, salary: number | null) => Promise<void> }) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [lastValue, setLastValue] = useState(value);

  // Re-sync when the saved value changes underneath (another tab, a refetch).
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value === null ? "" : String(value));
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== null) onSave(empCode, null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(value === null ? "" : String(value));
      return;
    }
    if (parsed !== value) onSave(empCode, parsed);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      (event.target as HTMLInputElement).blur();
    }
    if (event.key === "Escape") {
      setDraft(value === null ? "" : String(value));
      (event.target as HTMLInputElement).blur();
    }
  }

  return (
    <input
      type="number"
      min={0}
      step="0.01"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      placeholder="—"
      aria-label="Salaire mensuel"
      className="w-28 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm tabular-nums text-slate-800 hover:border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:ring-indigo-950"
    />
  );
}
