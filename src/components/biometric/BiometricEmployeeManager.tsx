"use client";

import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ColorSwatchPicker } from "@/components/admin/ColorSwatchPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Avatar } from "@/components/ui/Avatar";
import { CalendarIcon, ClockIcon, EyeIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { BiometricEmployeeScheduleEditor } from "./BiometricEmployeeScheduleEditor";
import { BiometricEmployeeLeaveEditor } from "./BiometricEmployeeLeaveEditor";
import { cn } from "@/lib/cn";
import type { BiometricEmployee } from "@/lib/biometricStats";
import type { BiometricLeave, BiometricSchedule } from "@/types/biometric";
import type { BiometricEmployeeOverridePatch } from "@/services/biometricEmployeeApi";

interface BiometricEmployeeManagerProps {
  open: boolean;
  employees: BiometricEmployee[];
  globalSchedule: BiometricSchedule;
  leaves: BiometricLeave[];
  onClose: () => void;
  onSave: (empCode: string, patch: BiometricEmployeeOverridePatch) => Promise<void>;
  onAddLeave: (empCode: string, startDate: string, endDate: string, reason: string | null) => Promise<void>;
  onDeleteLeave: (id: string) => Promise<void>;
}

/** Manage-employees modal for the Biométrie page — mirrors ThreeCxUserManager
 * (src/components/calls/ThreeCxUserManager.tsx): lets the auto-detected
 * employees be renamed, recolored, or hidden (a soft "delete": attendance
 * history stays, only the picker/charts stop showing that employee). */
export function BiometricEmployeeManager({ open, employees, globalSchedule, leaves, onClose, onSave, onAddLeave, onDeleteLeave }: BiometricEmployeeManagerProps) {
  const [pendingHideCode, setPendingHideCode] = useState<string | null>(null);
  const [schedulingCode, setSchedulingCode] = useState<string | null>(null);
  const [leaveCode, setLeaveCode] = useState<string | null>(null);
  if (!open) return null;

  const pendingEmployee = employees.find((e) => e.empCode === pendingHideCode) ?? null;
  const schedulingEmployee = employees.find((e) => e.empCode === schedulingCode) ?? null;
  const leaveEmployee = employees.find((e) => e.empCode === leaveCode) ?? null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-employee-manager-title"
        className="flex max-h-[80vh] w-full max-w-md animate-scale-in flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 id="biometric-employee-manager-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Employés
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <ul className="overflow-y-auto">
          {employees.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">Aucun employé détecté pour l&apos;instant.</li>}
          {employees.map((e) => (
            <EmployeeRow
              key={e.empCode}
              employee={e}
              leaveCount={leaves.filter((l) => l.empCode === e.empCode).length}
              onSave={onSave}
              onRequestHide={() => setPendingHideCode(e.empCode)}
              onRequestSchedule={() => setSchedulingCode(e.empCode)}
              onRequestLeave={() => setLeaveCode(e.empCode)}
            />
          ))}
        </ul>

        <BiometricEmployeeScheduleEditor
          open={schedulingCode !== null}
          employee={schedulingEmployee}
          globalSchedule={globalSchedule}
          onClose={() => setSchedulingCode(null)}
          onSave={onSave}
        />

        <BiometricEmployeeLeaveEditor
          open={leaveCode !== null}
          employee={leaveEmployee}
          leaves={leaves}
          onClose={() => setLeaveCode(null)}
          onAdd={onAddLeave}
          onDelete={onDeleteLeave}
        />

        <ConfirmDialog
          open={pendingHideCode !== null}
          title="Masquer cet employé ?"
          description={
            pendingEmployee
              ? `"${pendingEmployee.name}" (${pendingEmployee.empCode}) sera masqué du filtre et des graphiques. Son historique de pointages reste intact — tu peux le restaurer à tout moment.`
              : ""
          }
          confirmLabel="Masquer"
          destructive
          onConfirm={async () => {
            if (pendingHideCode) await onSave(pendingHideCode, { hidden: true });
            setPendingHideCode(null);
          }}
          onCancel={() => setPendingHideCode(null)}
        />
      </div>
    </div>,
    document.body
  );
}

interface EmployeeRowProps {
  employee: BiometricEmployee;
  leaveCount: number;
  onSave: (empCode: string, patch: BiometricEmployeeOverridePatch) => Promise<void>;
  onRequestHide: () => void;
  onRequestSchedule: () => void;
  onRequestLeave: () => void;
}

function EmployeeRow({ employee, leaveCount, onSave, onRequestHide, onRequestSchedule, onRequestLeave }: EmployeeRowProps) {
  const [name, setName] = useState(employee.name);

  function commit() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== employee.name) onSave(employee.empCode, { name: trimmed });
    else setName(employee.name);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      (event.target as HTMLInputElement).blur();
    }
    if (event.key === "Escape") {
      setName(employee.name);
      (event.target as HTMLInputElement).blur();
    }
  }

  return (
    <li className={cn("flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-slate-800", employee.hidden && "opacity-50")}>
      <ColorSwatchPicker value={employee.color} onChange={(color) => onSave(employee.empCode, { color })} />
      <Avatar name={employee.name} color={employee.color} size="sm" />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-label={`Renommer ${employee.name}`}
        className="flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-slate-800 hover:border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:ring-indigo-950"
      />
      <span className="shrink-0 text-xs text-slate-400">{employee.empCode}</span>
      <button
        type="button"
        onClick={onRequestSchedule}
        className={cn(
          "rounded-md p-1.5 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400",
          employee.scheduleOverride ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400"
        )}
        aria-label={`Heures de travail de ${employee.name}`}
        title={
          employee.saturdayOff
            ? "Samedi non travaillé" + (employee.scheduleOverride ? " · horaire personnalisé" : "")
            : employee.scheduleOverride
              ? "Horaire personnalisé actif"
              : "Heures de travail (planning global)"
        }
      >
        <ClockIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRequestLeave}
        className={cn(
          "rounded-md p-1.5 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400",
          leaveCount > 0 ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400"
        )}
        aria-label={`Congés de ${employee.name}`}
        title={leaveCount > 0 ? `${leaveCount} congé${leaveCount > 1 ? "s" : ""} enregistré${leaveCount > 1 ? "s" : ""}` : "Congés"}
      >
        <CalendarIcon className="h-4 w-4" />
      </button>
      {employee.hidden ? (
        <button
          type="button"
          onClick={() => onSave(employee.empCode, { hidden: false })}
          className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
          aria-label={`Restaurer ${employee.name}`}
          title="Restaurer"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onRequestHide}
          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label={`Masquer ${employee.name}`}
          title="Masquer"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
