"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { TrashIcon, XIcon } from "@/components/ui/icons";
import type { BiometricEmployee } from "@/lib/biometricStats";
import type { BiometricLeave } from "@/types/biometric";

interface BiometricEmployeeLeaveEditorProps {
  open: boolean;
  employee: BiometricEmployee | null;
  leaves: BiometricLeave[];
  onClose: () => void;
  onAdd: (empCode: string, startDate: string, endDate: string, reason: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

/** "JJ/MM/AAAA" from a "YYYY-MM-DD" calendar day — these are already
 * Casablanca calendar days, so this is a pure string reshuffle rather than
 * a Date round-trip that would drag the viewer's timezone back in. */
function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

/** Booked leave (congé) for one employee, opened from the Gérer modal
 * alongside the work-hours editor. Days covered here never count as an
 * absence, and are never docked from pay (see computeMonthlyAbsences /
 * computePayroll). */
export function BiometricEmployeeLeaveEditor({ open, employee, leaves, onClose, onAdd, onDelete }: BiometricEmployeeLeaveEditorProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpenFor, setWasOpenFor] = useState<string | null>(null);

  const openKey = open && employee ? employee.empCode : null;
  if (openKey !== wasOpenFor) {
    setWasOpenFor(openKey);
    setStartDate("");
    setEndDate("");
    setReason("");
    setError(null);
  }

  if (!open || !employee) return null;

  const employeeLeaves = leaves.filter((l) => l.empCode === employee.empCode).sort((a, b) => b.startDate.localeCompare(a.startDate));

  async function handleAdd() {
    if (!employee) return;
    // A single-day leave is the common case, so an empty end date means
    // "same day" rather than being rejected as incomplete.
    const from = startDate;
    const to = endDate || startDate;
    if (!from) {
      setError("Choisis une date de début.");
      return;
    }
    if (to < from) {
      setError("La date de fin doit suivre la date de début.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd(employee.empCode, from, to, reason.trim() || null);
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] flex animate-fade-in items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-leave-title"
        className="flex max-h-[85vh] w-full max-w-md animate-scale-in flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h2 id="biometric-leave-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Congés — {employee.name}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Les jours de congé ne comptent jamais comme une absence et ne sont pas déduits du salaire.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Du</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Au (inclus)</span>
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Motif (facultatif)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Congé annuel, maladie…" className={inputClass} />
        </label>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !startDate}
          className="mt-3 self-start rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Ajouter le congé"}
        </button>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Congés enregistrés</p>
        {employeeLeaves.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Aucun congé enregistré pour cet employé.</p>
        ) : (
          <ul className="mt-2 flex-1 overflow-y-auto">
            {employeeLeaves.map((leave) => (
              <li key={leave.id} className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 dark:text-slate-100">
                    {leave.startDate === leave.endDate
                      ? `le ${formatDateKey(leave.startDate)}`
                      : `du ${formatDateKey(leave.startDate)} au ${formatDateKey(leave.endDate)}`}
                  </p>
                  {leave.reason && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{leave.reason}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(leave.id)}
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                  aria-label="Supprimer ce congé"
                  title="Supprimer"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
