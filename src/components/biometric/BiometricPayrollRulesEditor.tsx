"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { formatDirham } from "@/lib/biometricStats";
import type { BiometricLatePenaltyRule } from "@/types/biometric";

interface BiometricPayrollRulesEditorProps {
  open: boolean;
  absenceDeduction: number;
  rules: BiometricLatePenaltyRule[];
  onClose: () => void;
  onSaveAbsenceDeduction: (amount: number) => Promise<void>;
  onAddRule: (fromMinutes: number, amount: number) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

/** The deduction rules behind the Salaires table: one amount per absent day,
 * plus the tiered lateness table ("a partir de N minutes de retard = -X DH").
 * A late arrival is charged by the single highest tier it reaches, which the
 * hint in the dialog spells out — summing the tiers instead would be an easy
 * (and expensive) thing to assume wrongly. */
export function BiometricPayrollRulesEditor({
  open,
  absenceDeduction,
  rules,
  onClose,
  onSaveAbsenceDeduction,
  onAddRule,
  onDeleteRule,
}: BiometricPayrollRulesEditorProps) {
  const [absenceDraft, setAbsenceDraft] = useState(String(absenceDeduction));
  const [minutes, setMinutes] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAbsenceDraft(String(absenceDeduction));
      setMinutes("");
      setAmount("");
      setError(null);
    }
  }

  if (!open) return null;

  async function handleAddRule() {
    const from = Number(minutes);
    const value = Number(amount);
    if (!Number.isInteger(from) || from < 0) {
      setError("Le seuil doit être un nombre entier de minutes.");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      setError("Le montant doit être un nombre positif.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAddRule(from, value);
      setMinutes("");
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'ajout.");
    } finally {
      setSaving(false);
    }
  }

  // Committed on blur rather than per keystroke: this is a single number the
  // whole payroll table recomputes from, so saving mid-typing would fire a
  // request (and a recompute) for every intermediate value.
  async function commitAbsenceDeduction() {
    const value = Number(absenceDraft);
    if (!Number.isFinite(value) || value < 0) {
      setAbsenceDraft(String(absenceDeduction));
      return;
    }
    if (value === absenceDeduction) return;
    await onSaveAbsenceDeduction(value);
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] flex animate-fade-in items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-payroll-rules-title"
        className="flex max-h-[85vh] w-full max-w-md animate-scale-in flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h2 id="biometric-payroll-rules-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Règles de déduction
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Montant déduit par jour d&apos;absence (DH)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={absenceDraft}
            onChange={(e) => setAbsenceDraft(e.target.value)}
            onBlur={commitAbsenceDeduction}
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Les jours de congé et les jours non travaillés ne comptent jamais comme absence.</p>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Retards</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Chaque jour de retard est facturé selon le palier le plus élevé atteint — jamais la somme des paliers.
        </p>

        <div className="mt-3 flex items-end gap-2">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">À partir de (min)</span>
            <input type="number" min={0} step="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="15" className={inputClass} />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Déduction (DH)</span>
            <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="30" className={inputClass} />
          </label>
          <button
            type="button"
            onClick={handleAddRule}
            disabled={saving || !minutes || !amount}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

        {rules.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucune règle de retard — les retards ne sont pas déduits pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 flex-1 overflow-y-auto">
            {[...rules]
              .sort((a, b) => a.fromMinutes - b.fromMinutes)
              .map((rule) => (
                <li key={rule.id} className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
                  <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">
                    À partir de <span className="font-medium tabular-nums">{rule.fromMinutes} min</span> de retard
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-red-600 dark:text-red-400">-{formatDirham(rule.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteRule(rule.id)}
                    className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    aria-label="Supprimer cette règle"
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
