import { COLOR_PALETTE } from "@/config/colorPalette";
import { casablancaDateKey, casablancaWallClockToUtc } from "@/lib/casablancaTime";
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
// ZKBio Time also reports a separate pair of "overtime" punch states (raw
// punch_state 4/5) whenever someone badges in/out again after their regular
// session — confirmed live these make up over a third of all punches, not a
// rare edge case. They're still a genuine arrival/departure, so anywhere
// "present" or "first entry"/"last exit" is judged from punch state, both
// pairs count — without this, someone whose latest punch today was an
// overtime check-in reads as "gone" instead of "still here".
export const STATUS_OVERTIME_IN = "Heures supplémentaires Entrée";
export const STATUS_OVERTIME_OUT = "Heures supplémentaires Sortie";
const ENTRY_STATES = new Set([STATUS_CHECK_IN, STATUS_OVERTIME_IN]);
const EXIT_STATES = new Set([STATUS_CHECK_OUT, STATUS_OVERTIME_OUT]);

// The building has two badge readers at the front: the main entrance and a
// second one just inside at the office door. Someone can badge at the office
// reader right after walking in, so counting both would double-count/blur
// arrival time. Entry/exit and lateness are anchored to the main entrance
// only — confirmed live against synced data as "Porte d'entre" (ZKBio
// Time's sync strips the accent), distinct from "Porte d'entre bureau".
// Punch-count/status charts elsewhere in this file intentionally still use
// every terminal — this restriction is specific to attendance timing.
const MAIN_ENTRANCE_TERMINAL_ALIAS = "Porte d'entre";

function atMainEntrance(events: BiometricEvent[]): BiometricEvent[] {
  return events.filter((e) => e.terminalAlias === MAIN_ENTRANCE_TERMINAL_ALIAS);
}

export const STATUS_LABEL: Record<string, string> = {
  [STATUS_CHECK_IN]: "Entrée",
  [STATUS_CHECK_OUT]: "Sortie",
  [STATUS_OVERTIME_IN]: "Entrée (heures sup.)",
  [STATUS_OVERTIME_OUT]: "Sortie (heures sup.)",
};

export const STATUS_BADGE: Record<string, string> = {
  [STATUS_CHECK_IN]: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  [STATUS_CHECK_OUT]: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  [STATUS_OVERTIME_IN]: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  [STATUS_OVERTIME_OUT]: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
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

/** Who counts as "present" for the most recent day actually covered by
 * `events` — the one thing punch data can answer that call data never
 * could, so it's the page's own signature view rather than a copy of
 * Calls' KPI-tiles-then-charts layout. Callers typically pass the page's
 * already-filtered events, so search/statut/département/date/etc. narrow
 * down who can appear here too: with no date filter that latest day is
 * today (so this reads as "right now"), but filtered to a specific past
 * day it reads as "who came in that day" instead — without this,
 * filtering to yesterday would show 0 people just because none of
 * yesterday's punches are literally "today".
 *
 * What "present" means depends on whether that day is still ongoing:
 * - The real current day: live occupancy — someone only counts if their
 *   most recent punch that day was a check-in (no matching check-out
 *   yet). Someone who already checked in *and* out today has finished
 *   for the day and shouldn't read as "still here".
 * - Any past day: the day is already over, so there's no "still inside"
 *   to check — anyone who punched at all that day counts, whether or
 *   not they later checked out (this is what makes a past day read as
 *   attendance rather than live presence).
 * Sorted by arrival time, most recent first — `lastPunchTime` is each
 * employee's first check-in that day (their earliest punch at all if
 * they have no check-in on record for it). */
export function getPresentEmployees(events: BiometricEvent[], employees: BiometricEmployee[]): PresentEmployee[] {
  const latestKey = latestLocalDate(events) ?? "";
  const isCurrentDay = latestKey === casablancaDateKey(new Date());

  const dayEventsByCode = new Map<string, BiometricEvent[]>();
  for (const event of atMainEntrance(events)) {
    if (casablancaDateKey(event.punchTime) !== latestKey) continue;
    if (!dayEventsByCode.has(event.empCode)) dayEventsByCode.set(event.empCode, []);
    dayEventsByCode.get(event.empCode)!.push(event);
  }

  const present: PresentEmployee[] = [];
  for (const employee of employees) {
    if (employee.hidden) continue;
    const dayEvents = dayEventsByCode.get(employee.empCode);
    if (!dayEvents || dayEvents.length === 0) continue;

    if (isCurrentDay) {
      const latest = dayEvents.reduce((a, b) => (b.punchTime > a.punchTime ? b : a));
      if (!ENTRY_STATES.has(latest.punchStateLabel)) continue;
      present.push({ ...employee, lastPunchTime: latest.punchTime });
    } else {
      const checkIns = dayEvents.filter((e) => ENTRY_STATES.has(e.punchStateLabel));
      const anchor = checkIns.length
        ? checkIns.reduce((a, b) => (b.punchTime < a.punchTime ? b : a))
        : dayEvents.reduce((a, b) => (b.punchTime < a.punchTime ? b : a));
      present.push({ ...employee, lastPunchTime: anchor.punchTime });
    }
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

/** The most recent calendar day (Casablanca time, not the viewer's own
 * possibly-misconfigured OS timezone) with at least one event in
 * the list, or null if there are none — the day getPresentEmployees scopes
 * itself to, and exported so the page can label the "Présents" panel
 * accordingly ("maintenant" vs "hier" vs a specific date) instead of
 * always saying "maintenant" even when showing a past day. */
export function latestLocalDate(events: BiometricEvent[]): string | null {
  let latestKey = "";
  for (const event of events) {
    const key = casablancaDateKey(event.punchTime);
    if (key > latestKey) latestKey = key;
  }
  return latestKey || null;
}

export interface DailyAttendanceRow {
  empCode: string;
  name: string;
  color: string;
  date: string; // "YYYY-MM-DD", Casablanca calendar day
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
 * Friday (only the lunch break differs there, not the morning start). Both
 * sides of that comparison are resolved as real Casablanca instants
 * (`casablancaWallClockToUtc`, not `Date#setHours`, which reads/writes the
 * *viewer's own* OS timezone) — a PC with its timezone set wrong used to
 * make everyone look 2-3h late or not late at all, purely from whichever
 * machine happened to be viewing the page. */
export function computeDailyAttendance(events: BiometricEvent[], employees: BiometricEmployee[], schedule: BiometricSchedule): DailyAttendanceRow[] {
  const employeeByCode = new Map(employees.map((e) => [e.empCode, e]));
  const byKey = new Map<string, BiometricEvent[]>();
  for (const event of atMainEntrance(events)) {
    const emp = employeeByCode.get(event.empCode);
    if (!emp || emp.hidden) continue;
    const key = `${event.empCode}__${casablancaDateKey(event.punchTime)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(event);
  }

  const rows: DailyAttendanceRow[] = [];
  for (const [key, dayEvents] of byKey) {
    const [empCode, date] = key.split("__");
    const emp = employeeByCode.get(empCode)!;
    const checkIns = dayEvents.filter((e) => ENTRY_STATES.has(e.punchStateLabel)).sort((a, b) => a.punchTime.localeCompare(b.punchTime));
    const checkOuts = dayEvents.filter((e) => EXIT_STATES.has(e.punchStateLabel)).sort((a, b) => a.punchTime.localeCompare(b.punchTime));
    const firstEntry = checkIns[0]?.punchTime ?? null;
    const lastExit = checkOuts.length ? checkOuts[checkOuts.length - 1].punchTime : null;

    let isLate = false;
    let lateSeconds = 0;
    if (firstEntry) {
      const expected = casablancaWallClockToUtc(`${date} ${schedule.startTime}:00`);
      const diffMs = new Date(firstEntry).getTime() - expected.getTime();
      if (diffMs > 0) {
        isLate = true;
        lateSeconds = Math.round(diffMs / 1000);
      }
    }

    rows.push({ empCode, name: emp.name, color: emp.color, date, firstEntry, lastExit, isLate, lateSeconds });
  }

  // Most recently punched first — within the same day this is entry time
  // (not alphabetical by name), so whoever just checked in surfaces at the
  // top instead of wherever their name happens to fall.
  return rows.sort((a, b) => {
    const aKey = a.firstEntry ?? a.lastExit ?? "";
    const bKey = b.firstEntry ?? b.lastExit ?? "";
    return bKey.localeCompare(aKey);
  });
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
