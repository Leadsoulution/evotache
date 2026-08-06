import { COLOR_PALETTE } from "@/config/colorPalette";
import type { BarChartDatum } from "@/components/stats/BarChart";
import type { BiometricEvent } from "@/types/biometric";

// ZKBio Time's punch_state_display vocabulary is set by whatever language
// the device/software itself is configured in — the API docs show English
// ("Check In"/"Check Out"), but this instance is French-localized and
// actually returns "Enregistrement"/"Départ" (confirmed live against real
// synced data). These two are used as the canonical check-in/check-out
// markers everywhere (KPI counts, sync counts) — unrecognized values still
// fall back to their raw label instead of disappearing, same pattern as
// 3CX's Direction handling.
export const STATUS_CHECK_IN = "Enregistrement";
export const STATUS_CHECK_OUT = "Départ";

export const STATUS_LABEL: Record<string, string> = {
  [STATUS_CHECK_IN]: "Entrée",
  [STATUS_CHECK_OUT]: "Sortie",
};

export const STATUS_BADGE: Record<string, string> = {
  [STATUS_CHECK_IN]: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  [STATUS_CHECK_OUT]: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
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

export interface PresentEmployee extends BiometricEmployee {
  lastPunchTime: string;
}

/** Who's currently in the building — the one thing punch data can answer
 * that call data never could, so it's the page's own signature view rather
 * than a copy of Calls' KPI-tiles-then-charts layout. An employee counts as
 * present when their single most recent punch (across the whole fetched
 * window, not the active filters — presence is a live fact, not something
 * that should disappear because of an unrelated date filter) was a
 * check-in. Sorted most-recently-arrived first. */
export function getPresentEmployees(events: BiometricEvent[], employees: BiometricEmployee[]): PresentEmployee[] {
  const latestByCode = new Map<string, BiometricEvent>();
  for (const event of events) {
    const current = latestByCode.get(event.empCode);
    if (!current || event.punchTime > current.punchTime) latestByCode.set(event.empCode, event);
  }
  const present: PresentEmployee[] = [];
  for (const employee of employees) {
    if (employee.hidden) continue;
    const latest = latestByCode.get(employee.empCode);
    if (latest?.punchStateLabel === STATUS_CHECK_IN) present.push({ ...employee, lastPunchTime: latest.punchTime });
  }
  return present.sort((a, b) => b.lastPunchTime.localeCompare(a.lastPunchTime));
}

/** Employees (from the full roster) with zero punches in the given event
 * set — meant to be called with the page's *filtered* events, so narrowing
 * by date/department/etc. changes who counts as absent for that slice,
 * unlike getPresentEmployees which deliberately ignores filters since
 * presence is a live fact. */
export function getAbsentEmployees(employees: BiometricEmployee[], filteredEvents: BiometricEvent[]): BiometricEmployee[] {
  const codesWithEvents = new Set(filteredEvents.map((e) => e.empCode));
  return employees.filter((e) => !e.hidden && !codesWithEvents.has(e.empCode));
}

export function countByEmployee(events: BiometricEvent[], employees: BiometricEmployee[]): BarChartDatum[] {
  return employees
    .filter((e) => !e.hidden)
    .map((e) => ({ key: e.empCode, label: e.name, value: eventsForEmployee(events, e.empCode).length, color: e.color }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}
