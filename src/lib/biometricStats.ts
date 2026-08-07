import { COLOR_PALETTE } from "@/config/colorPalette";
import type { BarChartDatum } from "@/components/stats/BarChart";
import type { BiometricEvent, BiometricSchedule } from "@/types/biometric";

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

export interface PresentEmployee extends BiometricEmployee {
  lastPunchTime: string;
}

/** Who's currently in the building — the one thing punch data can answer
 * that call data never could, so it's the page's own signature view rather
 * than a copy of Calls' KPI-tiles-then-charts layout. Scoped to *today*
 * only (not the active filters — presence is a live fact, not something
 * that should disappear because of an unrelated date filter, but it also
 * shouldn't persist forever: someone who checked in yesterday and never
 * checked out must not still read as "present" once a new day starts).
 * Within today, an employee counts as present when their most recent punch
 * was a check-in — whether or not they've checked out yet is exactly what
 * decides that, so someone who checked in today with no check-out yet
 * still (correctly) shows as present. Sorted most-recently-arrived first. */
export function getPresentEmployees(events: BiometricEvent[], employees: BiometricEmployee[]): PresentEmployee[] {
  const todayKey = localDateKey(new Date().toISOString());
  const latestByCode = new Map<string, BiometricEvent>();
  for (const event of events) {
    if (localDateKey(event.punchTime) !== todayKey) continue;
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

function localDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface DailyAttendanceRow {
  empCode: string;
  name: string;
  color: string;
  date: string; // "YYYY-MM-DD", browser-local calendar day
  firstEntry: string | null; // ISO
  lastExit: string | null; // ISO
  isLate: boolean;
  lateSeconds: number;
}

/** One row per (employee, calendar day) present in the given event set —
 * driven by the page's filtered events (same as getAbsentEmployees), so a
 * date-range filter naturally produces one row per day per employee rather
 * than one row overall. Lateness compares that day's first check-in
 * against `schedule.startTime` — the same cutoff every day, including
 * Friday (only the lunch break differs there, not the morning start). */
export function computeDailyAttendance(events: BiometricEvent[], employees: BiometricEmployee[], schedule: BiometricSchedule): DailyAttendanceRow[] {
  const employeeByCode = new Map(employees.map((e) => [e.empCode, e]));
  const byKey = new Map<string, BiometricEvent[]>();
  for (const event of events) {
    const emp = employeeByCode.get(event.empCode);
    if (!emp || emp.hidden) continue;
    const key = `${event.empCode}__${localDateKey(event.punchTime)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(event);
  }

  const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
  const rows: DailyAttendanceRow[] = [];
  for (const [key, dayEvents] of byKey) {
    const [empCode, date] = key.split("__");
    const emp = employeeByCode.get(empCode)!;
    const checkIns = dayEvents.filter((e) => e.punchStateLabel === STATUS_CHECK_IN).sort((a, b) => a.punchTime.localeCompare(b.punchTime));
    const checkOuts = dayEvents.filter((e) => e.punchStateLabel === STATUS_CHECK_OUT).sort((a, b) => a.punchTime.localeCompare(b.punchTime));
    const firstEntry = checkIns[0]?.punchTime ?? null;
    const lastExit = checkOuts.length ? checkOuts[checkOuts.length - 1].punchTime : null;

    let isLate = false;
    let lateSeconds = 0;
    if (firstEntry) {
      const entryDate = new Date(firstEntry);
      const expected = new Date(entryDate);
      expected.setHours(startHour, startMinute, 0, 0);
      const diffMs = entryDate.getTime() - expected.getTime();
      if (diffMs > 0) {
        isLate = true;
        lateSeconds = Math.round(diffMs / 1000);
      }
    }

    rows.push({ empCode, name: emp.name, color: emp.color, date, firstEntry, lastExit, isLate, lateSeconds });
  }

  return rows.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : b.date.localeCompare(a.date)));
}

export function formatLateDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (hours > 0 || minutes > 0) parts.push(`${minutes} min`);
  parts.push(`${seconds}s`);
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
}

/** How many days each employee was late — built from computeDailyAttendance
 * rows (already filtered), so it reflects the same period as the rest of
 * the page's stats. */
export function countLateByEmployee(rows: DailyAttendanceRow[]): BarChartDatum[] {
  const counts = new Map<string, { label: string; color: string; value: number }>();
  for (const row of rows) {
    if (!row.isLate) continue;
    const current = counts.get(row.empCode);
    if (current) current.value += 1;
    else counts.set(row.empCode, { label: row.name, color: row.color, value: 1 });
  }
  return Array.from(counts.entries())
    .map(([empCode, v]) => ({ key: empCode, label: v.label, value: v.value, color: v.color }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}
