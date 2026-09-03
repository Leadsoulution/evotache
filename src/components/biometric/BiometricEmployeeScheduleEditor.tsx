"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/ui/icons";
import type { BiometricSchedule } from "@/types/biometric";
import type { BiometricEmployee } from "@/lib/biometricStats";
import type { BiometricEmployeeOverridePatch } from "@/services/biometricEmployeeApi";

interface BiometricEmployeeScheduleEditorProps {
  open: boolean;
  employee: BiometricEmployee | null;
  globalSchedule: BiometricSchedule;
  onClose: () => void;
  onSave: (empCode: string, patch: BiometricEmployeeOverridePatch) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500";

/** Per-employee override of the 5 BiometricScheduleEditor fields — each one
 * customized here takes precedence over the company-wide schedule for that
 * employee only (see resolveEmployeeSchedule in biometricStats.ts); the
 * others keep following the global schedule automatically. */
export function BiometricEmployeeScheduleEditor({ open, employee, globalSchedule, onClose, onSave }: BiometricEmployeeScheduleEditorProps) {
  const [custom, setCustom] = useState(false);
  // Deliberately outside the `custom` toggle: not working Saturdays isn't a
  // custom set of hours, so someone can keep the company-wide schedule and
  // still have Saturdays off.
  const [saturdayOff, setSaturdayOff] = useState(false);
  const [draft, setDraft] = useState<BiometricSchedule>(globalSchedule);
  const [wasOpenFor, setWasOpenFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openKey = open && employee ? employee.empCode : null;
  if (openKey !== wasOpenFor) {
    setWasOpenFor(openKey);
    if (openKey && employee) {
      setCustom(Boolean(employee.scheduleOverride));
      setSaturdayOff(employee.saturdayOff);
      setDraft({ ...globalSchedule, ...employee.scheduleOverride });
    }
  }

  if (!open || !employee) return null;

  async function handleSave() {
    setSaving(true);
    try {
      if (custom) {
        await onSave(employee!.empCode, {
          saturdayOff,
          startTime: draft.startTime,
          endTime: draft.endTime,
          lunchBreakStart: draft.lunchBreakStart,
          lunchBreakEnd: draft.lunchBreakEnd,
          fridayBreakStart: draft.fridayBreakStart,
          fridayBreakEnd: draft.fridayBreakEnd,
          saturdayEndTime: draft.saturdayEndTime,
        });
      } else {
        await onSave(employee!.empCode, {
          saturdayOff,
          startTime: null,
          endTime: null,
          lunchBreakStart: null,
          lunchBreakEnd: null,
          fridayBreakStart: null,
          fridayBreakEnd: null,
          saturdayEndTime: null,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] flex animate-fade-in items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-employee-schedule-title"
        className="w-full max-w-sm animate-scale-in rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h2 id="biometric-employee-schedule-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Heures de travail — {employee.name}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={custom}
            onChange={(e) => {
              setCustom(e.target.checked);
              if (e.target.checked) setDraft({ ...globalSchedule, ...employee.scheduleOverride });
            }}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
          />
          Horaire personnalisé pour cet employé
        </label>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {custom
            ? "Ces heures remplacent le planning global pour cet employé uniquement."
            : "Décoché : cet employé suit le planning global de l'entreprise (grisé ci-dessous)."}
        </p>

        <label className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
          <input
            type="checkbox"
            checked={saturdayOff}
            onChange={(e) => setSaturdayOff(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
          />
          Ne travaille pas le samedi
        </label>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Coché : les samedis ne comptent jamais comme une absence pour cet employé.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Heure de début</span>
            <input type="time" disabled={!custom} value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Heure de fin</span>
            <input type="time" disabled={!custom} value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Pause déjeuner — début</span>
            <input
              type="time"
              disabled={!custom}
              value={draft.lunchBreakStart}
              onChange={(e) => setDraft({ ...draft, lunchBreakStart: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Pause déjeuner — fin</span>
            <input
              type="time"
              disabled={!custom}
              value={draft.lunchBreakEnd}
              onChange={(e) => setDraft({ ...draft, lunchBreakEnd: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Pause vendredi — début</span>
            <input
              type="time"
              disabled={!custom}
              value={draft.fridayBreakStart}
              onChange={(e) => setDraft({ ...draft, fridayBreakStart: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Pause vendredi — fin</span>
            <input type="time" disabled={!custom} value={draft.fridayBreakEnd} onChange={(e) => setDraft({ ...draft, fridayBreakEnd: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Samedi — heure de fin</span>
            <input
              type="time"
              disabled={!custom}
              value={draft.saturdayEndTime}
              onChange={(e) => setDraft({ ...draft, saturdayEndTime: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
