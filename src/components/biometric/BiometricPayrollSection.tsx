"use client";

import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { CashIcon } from "@/components/ui/icons";
import { BiometricSectionTitle } from "./BiometricSectionTitle";
import { formatDirham, formatLateDuration } from "@/lib/biometricStats";
import type { PayrollRow } from "@/lib/biometricStats";

interface BiometricPayrollSectionProps {
  rows: PayrollRow[];
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  onSaveSalary: (empCode: string, salary: number | null) => Promise<void>;
  onSaveVirement: (empCode: string, amount: number | null) => Promise<void>;
  /** Avance/prime are per (employee, month), unlike salaire/virement which
   * stay fixed across months — always a plain number (0 when unset, never
   * null), see BiometricPayrollAdjustment. */
  onSaveAdvance: (empCode: string, amount: number) => Promise<void>;
  onSaveBonus: (empCode: string, amount: number) => Promise<void>;
}

/** Payroll for one month: each employee's gross pay minus what their
 * lateness and absences cost, plus/minus this month's prime/avance, purely
 * from their own salary — one absent day costs salaire/26, and lateness is
 * charged per day rounded UP to the next whole hour (see computePayroll's
 * own docs for the exact rule). Virement is a separate, independently-set
 * fixed amount paid by bank transfer each month; espèce is simply what's
 * left of the net after that. Deliberately rendered only for
 * managers/admins (the API refuses it for anyone else) — salary is the one
 * thing on this page a view-only attendance user must not see. */
export function BiometricPayrollSection({ rows, monthKey, onMonthChange, onSaveSalary, onSaveVirement, onSaveAdvance, onSaveBonus }: BiometricPayrollSectionProps) {
  const totals = rows.reduce(
    (acc, row) => ({
      salary: acc.salary + (row.monthlySalary ?? 0),
      advance: acc.advance + row.advance,
      bonus: acc.bonus + row.bonus,
      deduction: acc.deduction + row.totalDeduction,
      net: acc.net + (row.netSalary ?? 0),
      virement: acc.virement + (row.virementAmount ?? 0),
      espece: acc.espece + (row.especeAmount ?? 0),
    }),
    { salary: 0, advance: 0, bonus: 0, deduction: 0, net: 0, virement: 0, espece: 0 }
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <BiometricSectionTitle icon={<CashIcon className="h-5 w-5 text-emerald-500" />}>Salaires</BiometricSectionTitle>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Salaire mensuel moins les retards et les absences du mois</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={monthKey}
            onChange={(e) => e.target.value && onMonthChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
          />
        </div>
      </div>
      <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        1 jour d&apos;absence = salaire ÷ 26 · un retard est facturé par jour, arrondi à l&apos;heure supérieure (10 min = 1h, 61 min = 2h) · Net à payer = salaire -
        déductions + prime - avance
      </p>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">Aucun employé à afficher.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="whitespace-nowrap px-4 py-2">Salarié</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Salaire (DH)</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Avance sur salaire</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Prime</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Retards</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Absences</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Congé</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Jours fériés</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Déductions</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Net à payer</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Virement</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2">Espèce</th>
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
                    <MoneyInput empCode={row.empCode} value={row.monthlySalary} onSave={onSaveSalary} ariaLabel="Salaire mensuel" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <MoneyInput
                      empCode={row.empCode}
                      value={row.advance || null}
                      onSave={(empCode, amount) => onSaveAdvance(empCode, amount ?? 0)}
                      ariaLabel="Avance sur salaire"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <MoneyInput empCode={row.empCode} value={row.bonus || null} onSave={(empCode, amount) => onSaveBonus(empCode, amount ?? 0)} ariaLabel="Prime" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.lateDays === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200" title={`Durée réelle : ${formatLateDuration(row.lateSeconds)}`}>
                        <span className="font-medium tabular-nums">{row.lateDays}</span> j
                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({row.lateHoursDeducted}h facturée{row.lateHoursDeducted > 1 ? "s" : ""})</span>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.absenceDays === 0 ? <span className="text-slate-400">—</span> : <span className="font-medium tabular-nums text-red-600 dark:text-red-400">{row.absenceDays} j</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.leaveDays === 0 ? <span className="text-slate-400">—</span> : <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{row.leaveDays} j</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.holidayDays === 0 ? <span className="text-slate-400">—</span> : <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{row.holidayDays} j</span>}
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
                      <span className="text-xs text-slate-400">Salaire à définir</span>
                    ) : (
                      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatDirham(row.netSalary)}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <MoneyInput empCode={row.empCode} value={row.virementAmount} onSave={onSaveVirement} ariaLabel="Montant par virement" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.especeAmount === null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatDirham(row.especeAmount)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800/40">
                <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">Total</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700 dark:text-slate-200">{formatDirham(totals.salary)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700 dark:text-slate-200">{formatDirham(totals.advance)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700 dark:text-slate-200">{formatDirham(totals.bonus)}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-red-600 dark:text-red-400">
                  {totals.deduction === 0 ? "—" : `-${formatDirham(totals.deduction)}`}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-800 dark:text-slate-100">{formatDirham(totals.net)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700 dark:text-slate-200">{formatDirham(totals.virement)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700 dark:text-slate-200">{formatDirham(totals.espece)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

/** Inline money cell (used for both Salaire and Virement) — committed on
 * blur/Enter rather than per keystroke, same as the employee rename field
 * in the Gérer modal, so the whole payroll table doesn't recompute (and
 * PATCH) on every digit typed. An emptied field clears the value back to
 * "not set" instead of saving 0. */
function MoneyInput({
  empCode,
  value,
  onSave,
  ariaLabel,
}: {
  empCode: string;
  value: number | null;
  onSave: (empCode: string, amount: number | null) => Promise<void>;
  ariaLabel: string;
}) {
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
      aria-label={ariaLabel}
      className="w-28 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm tabular-nums text-slate-800 hover:border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:ring-indigo-950"
    />
  );
}
