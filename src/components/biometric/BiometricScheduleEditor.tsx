"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/ui/icons";
import type { BiometricSchedule } from "@/types/biometric";

interface BiometricScheduleEditorProps {
  open: boolean;
  schedule: BiometricSchedule;
  onClose: () => void;
  onSave: (schedule: BiometricSchedule) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

/** Edits the "on time" cutoff used to flag late arrivals (computeDailyAttendance
 * in biometricStats.ts) and shown as the Heures d'ouverture preset in the
 * time filter — one shared config, singleton on the server. */
export function BiometricScheduleEditor({ open, schedule, onClose, onSave }: BiometricScheduleEditorProps) {
  const [draft, setDraft] = useState(schedule);
  const [wasOpen, setWasOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(schedule);
  }

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-schedule-title"
        className="w-full max-w-sm animate-scale-in rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h2 id="biometric-schedule-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Heures de travail
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Un employé est marqué en retard si sa première entrée de la journée (dans la plage horaire du jour, ci-dessous) est après l&apos;heure de début. Lundi-jeudi utilisent l&apos;heure de fin ; vendredi est coupé en deux par la pause ; samedi a sa propre heure de fin ; dimanche n&apos;est pas compté.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Heure de début</span>
            <input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Heure de fin</span>
            <input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Pause vendredi — début</span>
            <input type="time" value={draft.fridayBreakStart} onChange={(e) => setDraft({ ...draft, fridayBreakStart: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Pause vendredi — fin</span>
            <input type="time" value={draft.fridayBreakEnd} onChange={(e) => setDraft({ ...draft, fridayBreakEnd: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Samedi — heure de fin</span>
            <input type="time" value={draft.saturdayEndTime} onChange={(e) => setDraft({ ...draft, saturdayEndTime: e.target.value })} className={inputClass} />
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
