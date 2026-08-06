import { COLOR_PALETTE } from "@/config/colorPalette";
import type { BarChartDatum } from "@/components/stats/BarChart";
import type { BiometricEvent } from "@/types/biometric";

// ZKBio Time's own punch_state_display vocabulary (per its API docs, "Check
// In"/"Check Out" confirmed; the others follow the same device's standard
// codes) — unrecognized values fall back to their raw label instead of
// disappearing, same pattern as 3CX's Direction handling.
export const STATUS_LABEL: Record<string, string> = {
  "Check In": "Entrée",
  "Check Out": "Sortie",
  "Break Out": "Pause (sortie)",
  "Break In": "Pause (retour)",
  "OverTime In": "Heures sup. (entrée)",
  "OverTime Out": "Heures sup. (sortie)",
};

export const STATUS_BADGE: Record<string, string> = {
  "Check In": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "Check Out": "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "Break Out": "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "Break In": "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "OverTime In": "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "OverTime Out": "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

const NO_DEPARTMENT_LABEL = "Sans département";

export interface BiometricEmployee {
  empCode: string;
  name: string;
  department: string | null;
  color: string;
  hidden: boolean;
}

// Per-employee override stored via /api/biometric/employees — layered onto
// the auto-derived name below, and the only way an employee gets excluded
// (hidden) from the picker/charts without touching attendance history.
export interface BiometricEmployeeOverride {
  empCode: string;
  name: string | null;
  color: string | null;
  hidden: boolean;
}

/** Employees, derived straight from the synced punch events rather than a
 * separate "list employees" API call — every event already carries the
 * employee's name/department. `overrides` layers on any admin-set display
 * name/color/hidden flag — default color is assigned by empCode order so it
 * stays stable across re-filters/re-sorts instead of depending on punch
 * counts. */
export function deriveEmployees(events: BiometricEvent[], overrides: BiometricEmployeeOverride[] = []): BiometricEmployee[] {
  const byCode = new Map<string, { name: string; department: string | null }>();
  for (const event of events) {
    if (!byCode.has(event.empCode)) byCode.set(event.empCode, { name: event.employeeName, department: event.department });
  }
  const overrideByCode = new Map(overrides.map((o) => [o.empCode, o]));
  return Array.from(byCode.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([empCode, auto], i) => {
      const override = overrideByCode.get(empCode);
      return {
        empCode,
        name: override?.name || auto.name,
        department: auto.department,
        color: override?.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
        hidden: override?.hidden ?? false,
      };
    });
}

export function eventsForEmployee(events: BiometricEvent[], empCode: string): BiometricEvent[] {
  return events.filter((e) => e.empCode === empCode);
}

export function countByStatus(events: BiometricEvent[]): BarChartDatum[] {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.punchStateLabel, (counts.get(e.punchStateLabel) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([status, value], i) => ({ key: status, label: STATUS_LABEL[status] ?? status, value, color: COLOR_PALETTE[i % COLOR_PALETTE.length] }))
    .sort((a, b) => b.value - a.value);
}

export function countByDepartment(events: BiometricEvent[]): BarChartDatum[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const dept = e.department || NO_DEPARTMENT_LABEL;
    counts.set(dept, (counts.get(dept) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([dept, value], i) => ({ key: dept, label: dept, value, color: COLOR_PALETTE[i % COLOR_PALETTE.length] }))
    .sort((a, b) => b.value - a.value);
}

export function countByEmployee(events: BiometricEvent[], employees: BiometricEmployee[]): BarChartDatum[] {
  return employees
    .filter((e) => !e.hidden)
    .map((e) => ({ key: e.empCode, label: e.name, value: eventsForEmployee(events, e.empCode).length, color: e.color }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}
