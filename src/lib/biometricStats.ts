import { COLOR_PALETTE } from "@/config/colorPalette";
import { casablancaDateKey, casablancaHourMinute, casablancaWallClockToUtc, casablancaWeekday } from "@/lib/casablancaTime";
import type { BarChartDatum } from "@/components/stats/BarChart";
import type { BiometricEvent, BiometricHoliday, BiometricLatePenaltyRule, BiometricLeave, BiometricPayrollConfig, BiometricSchedule } from "@/types/biometric";

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

/** Whether `iso` falls inside that calendar day's real work-hours window
 * (Casablanca time): Monday-Thursday and Saturday split around the midday
 * lunch break (`lunchBreakStart`-`lunchBreakEnd`), Friday split around its
 * own (longer) prayer break instead, Sunday never. Confirmed live that the
 * device's own "Enregistrement"/"Heures supplémentaires" labelling doesn't
 * line up with the business's actual hours (e.g. an ordinary mid-afternoon
 * arrival can get logged as "overtime") — this checks the real clock time
 * instead of trusting that label, so a stray punch genuinely outside real
 * hours doesn't get treated as a normal arrival for lateness purposes, and
 * a normal arrival mislabeled as "overtime" doesn't get wrongly excluded. */
export function isWithinWorkHours(iso: string, schedule: BiometricSchedule): boolean {
  const weekday = casablancaWeekday(iso);
  if (weekday === 0) return false;
  const hm = casablancaHourMinute(iso);
  if (weekday === 5) {
    return (hm >= schedule.startTime && hm <= schedule.fridayBreakStart) || (hm >= schedule.fridayBreakEnd && hm <= schedule.endTime);
  }
  const dayEndTime = weekday === 6 ? schedule.saturdayEndTime : schedule.endTime;
  return (hm >= schedule.startTime && hm <= schedule.lunchBreakStart) || (hm >= schedule.lunchBreakEnd && hm <= dayEndTime);
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
  /** Only the fields this employee has customized — null (or a missing
   * field) means "inherit the company-wide BiometricSchedule" for that
   * field. Use resolveEmployeeSchedule() to get the fully-merged schedule
   * actually in effect for this employee. */
  scheduleOverride: Partial<BiometricSchedule> | null;
  /** Doesn't work Saturdays — a Saturday then never counts as an absence
   * for them (see isWorkedDay). Independent of scheduleOverride: someone
   * can keep the company hours and still have Saturdays off. */
  saturdayOff: boolean;
  /** Gross monthly pay in DH, or null if none is set — null keeps them out
   * of the Salaires table rather than showing them at 0. */
  monthlySalary: number | null;
}

// Per-employee override stored via /api/biometric/employees — layered onto
// the auto-derived name below, and the only way an employee gets excluded
// (hidden) from the picker/charts without touching attendance history. The
// 5 schedule fields are each independently nullable: null means "inherit
// the global schedule for this field", so setting only e.g. `endTime`
// leaves start time, Friday break, and Saturday end all following the
// company-wide default.
export interface BiometricEmployeeOverride {
  empCode: string;
  name: string | null;
  color: string | null;
  hidden: boolean;
  startTime: string | null;
  endTime: string | null;
  lunchBreakStart: string | null;
  lunchBreakEnd: string | null;
  fridayBreakStart: string | null;
  fridayBreakEnd: string | null;
  saturdayEndTime: string | null;
  saturdayOff: boolean;
  monthlySalary: number | null;
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
      const scheduleOverride: Partial<BiometricSchedule> = {};
      if (override?.startTime) scheduleOverride.startTime = override.startTime;
      if (override?.endTime) scheduleOverride.endTime = override.endTime;
      if (override?.lunchBreakStart) scheduleOverride.lunchBreakStart = override.lunchBreakStart;
      if (override?.lunchBreakEnd) scheduleOverride.lunchBreakEnd = override.lunchBreakEnd;
      if (override?.fridayBreakStart) scheduleOverride.fridayBreakStart = override.fridayBreakStart;
      if (override?.fridayBreakEnd) scheduleOverride.fridayBreakEnd = override.fridayBreakEnd;
      if (override?.saturdayEndTime) scheduleOverride.saturdayEndTime = override.saturdayEndTime;
      return {
        empCode,
        name: override?.name || auto.name,
        department: auto.department,
        color: override?.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
        hidden: override?.hidden ?? false,
        scheduleOverride: Object.keys(scheduleOverride).length ? scheduleOverride : null,
        saturdayOff: override?.saturdayOff ?? false,
        monthlySalary: override?.monthlySalary ?? null,
      };
    });
}

/** The work-hours schedule actually in effect for this employee — the
 * company-wide `defaultSchedule` with any of that employee's own
 * start/end/break customizations layered on top. */
export function resolveEmployeeSchedule(employee: BiometricEmployee, defaultSchedule: BiometricSchedule): BiometricSchedule {
  return employee.scheduleOverride ? { ...defaultSchedule, ...employee.scheduleOverride } : defaultSchedule;
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
  pauseSeconds: number;
}

/** One row per (employee, calendar day) present in the given event set —
 * driven by the page's filtered events (same as getAbsentEmployees), so a
 * date-range filter naturally produces one row per day per employee rather
 * than one row overall. "First entry" is simply the earliest entry-type
 * punch of the day, whatever time it occurs — it must NOT be bounded by
 * `isWithinWorkHours` (that's for the Heures d'ouverture filter only):
 * someone who arrives early is exactly the case lateness must recognize as
 * *not* late, so excluding early punches would hide the real arrival behind
 * a later one and make an on-time employee look hours late. Lateness then
 * compares that first entry against `schedule.startTime` — the same cutoff
 * every workday, including Friday (only the lunch break differs there, not
 * the morning start). Both sides of that comparison are resolved as real
 * Casablanca instants (`casablancaWallClockToUtc`, not `Date#setHours`,
 * which reads/writes the *viewer's own* OS timezone) — a PC with its
 * timezone set wrong used to make everyone look 2-3h late or not late at
 * all, purely from whichever machine happened to be viewing the page.
 * `defaultSchedule` is the company-wide fallback — an employee with their
 * own schedule override (resolveEmployeeSchedule) is judged against their
 * own hours instead. */
export function computeDailyAttendance(events: BiometricEvent[], employees: BiometricEmployee[], defaultSchedule: BiometricSchedule): DailyAttendanceRow[] {
  const employeeByCode = new Map(employees.map((e) => [e.empCode, e]));
  const byKey = new Map<string, BiometricEvent[]>();
  for (const event of atMainEntrance(events)) {
    const emp = employeeByCode.get(event.empCode);
    if (!emp || emp.hidden) continue;
    const key = `${event.empCode}__${casablancaDateKey(event.punchTime)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(event);
  }
  // Earliest punch of the day at ANY terminal (not just the main entrance),
  // per employee+day — sanity-checks a main-entrance "first entry"
  // candidate below: if the employee was already active elsewhere (almost
  // always the office-door reader) before that candidate, it isn't really
  // their first arrival — more likely a mid-day exit/return through the
  // main entrance instead (e.g. a lunch outing) — so it can't be judged
  // for lateness.
  const earliestAnyTerminalByKey = new Map<string, string>();
  for (const event of events) {
    const key = `${event.empCode}__${casablancaDateKey(event.punchTime)}`;
    const current = earliestAnyTerminalByKey.get(key);
    if (!current || event.punchTime < current) earliestAnyTerminalByKey.set(key, event.punchTime);
  }

  const rows: DailyAttendanceRow[] = [];
  for (const [key, dayEvents] of byKey) {
    const [empCode, date] = key.split("__");
    const emp = employeeByCode.get(empCode)!;
    const checkIns = dayEvents.filter((e) => ENTRY_STATES.has(e.punchStateLabel)).sort((a, b) => a.punchTime.localeCompare(b.punchTime));
    const checkOuts = dayEvents.filter((e) => EXIT_STATES.has(e.punchStateLabel)).sort((a, b) => a.punchTime.localeCompare(b.punchTime));
    const firstEntryCandidate = checkIns[0]?.punchTime ?? null;
    const earliestAnyTerminal = earliestAnyTerminalByKey.get(key);
    const firstEntry = firstEntryCandidate && earliestAnyTerminal && earliestAnyTerminal < firstEntryCandidate ? null : firstEntryCandidate;
    const lastExit = checkOuts.length ? checkOuts[checkOuts.length - 1].punchTime : null;

    // Pause time: no dedicated "break" punch type exists on the device — a
    // pause shows up as an ordinary exit followed later the same day by an
    // ordinary entry (regular or "heures sup.", whichever the device
    // happened to label it), same as anyone stepping out and coming back.
    // The gap before the day's first arrival and after its last exit isn't
    // a pause (nothing to return from/to), so those are excluded by only
    // counting an exit that's later matched by a subsequent entry.
    let pauseSeconds = 0;
    let hasArrived = false;
    let openExitTime: string | null = null;
    for (const event of [...dayEvents].sort((a, b) => a.punchTime.localeCompare(b.punchTime))) {
      if (ENTRY_STATES.has(event.punchStateLabel)) {
        if (hasArrived && openExitTime) {
          pauseSeconds += Math.round((new Date(event.punchTime).getTime() - new Date(openExitTime).getTime()) / 1000);
          openExitTime = null;
        }
        hasArrived = true;
      } else if (EXIT_STATES.has(event.punchStateLabel) && hasArrived) {
        openExitTime = event.punchTime;
      }
    }

    let isLate = false;
    let lateSeconds = 0;
    if (firstEntry) {
      const schedule = resolveEmployeeSchedule(emp, defaultSchedule);
      const expected = casablancaWallClockToUtc(`${date} ${schedule.startTime}:00`);
      const diffMs = new Date(firstEntry).getTime() - expected.getTime();
      if (diffMs > 0) {
        isLate = true;
        lateSeconds = Math.round(diffMs / 1000);
      }
    }

    rows.push({ empCode, name: emp.name, color: emp.color, date, firstEntry, lastExit, isLate, lateSeconds, pauseSeconds });
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

export interface MonthlyAbsenceRow {
  empCode: string;
  name: string;
  color: string;
  dates: string[]; // "YYYY-MM-DD", ascending
}

/** One row per employee who had at least one absence in `monthKey`
 * ("YYYY-MM") — a Monday-Saturday day (Sunday excluded: real punch
 * activity is far lower that day, confirmed against synced data) with no
 * punch at all, at any terminal. `events` must be the *full* unfiltered
 * history, not just the target month: an employee's first-ever recorded
 * punch anywhere caps how far back absences are counted for them, so a day
 * before biometric tracking even started for them (or for the whole
 * system) never reads as a false absence. A day still in progress (today,
 * when `monthKey` is the current month) is never counted either — it isn't
 * over yet, so there's nothing confirmed to count. `todayKey` is passed in
 * rather than read from `new Date()` so this stays a pure function of its
 * inputs (callers pass `casablancaDateKey(new Date())`). */
export function computeMonthlyAbsences(
  events: BiometricEvent[],
  employees: BiometricEmployee[],
  leaves: BiometricLeave[],
  holidays: BiometricHoliday[],
  monthKey: string,
  todayKey: string
): MonthlyAbsenceRow[] {
  const presentDatesByEmp = new Map<string, Set<string>>();
  const firstPunchDateByEmp = new Map<string, string>();
  for (const event of events) {
    const dateKey = casablancaDateKey(event.punchTime);
    if (!presentDatesByEmp.has(event.empCode)) presentDatesByEmp.set(event.empCode, new Set());
    presentDatesByEmp.get(event.empCode)!.add(dateKey);
    const firstSoFar = firstPunchDateByEmp.get(event.empCode);
    if (!firstSoFar || dateKey < firstSoFar) firstPunchDateByEmp.set(event.empCode, dateKey);
  }

  const [year, month] = monthKey.split("-").map(Number);
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const rows: MonthlyAbsenceRow[] = [];
  for (const employee of employees) {
    if (employee.hidden) continue;
    const presentDates = presentDatesByEmp.get(employee.empCode) ?? new Set<string>();
    const firstPunchDate = firstPunchDateByEmp.get(employee.empCode) ?? todayKey;
    const employeeLeaves = leaves.filter((l) => l.empCode === employee.empCode);
    const dates: string[] = [];
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
      if (dateKey >= todayKey) break;
      if (dateKey < firstPunchDate) continue;
      // Sunday, a Saturday for someone who has Saturdays off, and any
      // booked leave day are all days this employee wasn't expected in —
      // none of them can be an absence.
      if (!isWorkedDay(employee, dateKey)) continue;
      if (isOnLeave(dateKey, employeeLeaves)) continue;
      if (isHoliday(dateKey, holidays)) continue;
      if (!presentDates.has(dateKey)) dates.push(dateKey);
    }
    if (dates.length > 0) rows.push({ empCode: employee.empCode, name: employee.name, color: employee.color, dates });
  }
  return rows.sort((a, b) => b.dates.length - a.dates.length);
}

/** "05, 06, 08 et 15" from a list of "YYYY-MM-DD" dates, day-of-month only
 * since the month/year is already the section's active filter. */
export function formatAbsenceDates(dates: string[]): string {
  const days = dates.map((d) => d.slice(-2));
  if (days.length === 1) return days[0];
  return `${days.slice(0, -1).join(", ")} et ${days[days.length - 1]}`;
}

/** Weekday (0=Sunday..6=Saturday) of a "YYYY-MM-DD" calendar day. Parsed as
 * UTC on purpose: the string is already a Casablanca calendar day, so this
 * is pure date arithmetic — going through the local Date constructor would
 * put the viewer's own timezone back into a value that no longer has one. */
export function weekdayOfDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Whether this employee was expected in on that calendar day: never on a
 * Sunday, never on a Saturday if they have Saturdays off, otherwise yes.
 * Leave is checked separately (isOnLeave) since it's a period, not a
 * recurring weekday. */
export function isWorkedDay(employee: Pick<BiometricEmployee, "saturdayOff">, dateKey: string): boolean {
  const weekday = weekdayOfDateKey(dateKey);
  if (weekday === 0) return false;
  if (weekday === 6 && employee.saturdayOff) return false;
  return true;
}

/** Whether that calendar day falls inside any of the given leave periods
 * (both ends inclusive). `leaves` must already be narrowed to one employee
 * — plain string comparison works since both sides are "YYYY-MM-DD". */
export function isOnLeave(dateKey: string, leaves: BiometricLeave[]): boolean {
  return leaves.some((l) => dateKey >= l.startDate && dateKey <= l.endDate);
}

/** Whether that calendar day is a company-wide public holiday — applies to
 * every employee alike, unlike isOnLeave which is per-person. */
export function isHoliday(dateKey: string, holidays: BiometricHoliday[]): boolean {
  return holidays.some((h) => h.date === dateKey);
}

/** DH docked for arriving `lateMinutes` late — the single highest tier that
 * arrival reaches, never the sum of every tier below it: with 5min=-10 and
 * 15min=-30 configured, a 20-minute arrival costs 30 DH, not 40. No
 * matching tier (or no tiers configured at all) costs nothing. */
export function penaltyForLateMinutes(lateMinutes: number, rules: BiometricLatePenaltyRule[]): number {
  let best: BiometricLatePenaltyRule | null = null;
  for (const rule of rules) {
    if (lateMinutes >= rule.fromMinutes && (!best || rule.fromMinutes > best.fromMinutes)) best = rule;
  }
  return best?.amount ?? 0;
}

export interface PayrollRow {
  empCode: string;
  name: string;
  color: string;
  monthlySalary: number | null;
  lateDays: number;
  lateSeconds: number;
  lateDeduction: number;
  absenceDays: number;
  absenceDeduction: number;
  leaveDays: number;
  totalDeduction: number;
  /** null when this employee has no salary set — deliberately not 0, so the
   * UI can say "à définir" instead of showing a bogus payslip. */
  netSalary: number | null;
}

/** Month-end payroll per employee: gross pay minus what lateness and
 * absences cost, for `monthKey` ("YYYY-MM").
 *
 * `events` must be the *full* history, not just that month's — absences come
 * from computeMonthlyAbsences, which needs everything to know when tracking
 * actually started for someone (so days before they were even hired aren't
 * billed as absences). Days inside a booked leave are charged neither as an
 * absence nor as lateness: someone who came in anyway while on leave
 * shouldn't be docked for arriving late on a day they weren't expected. */
export function computePayroll(
  events: BiometricEvent[],
  employees: BiometricEmployee[],
  leaves: BiometricLeave[],
  holidays: BiometricHoliday[],
  rules: BiometricLatePenaltyRule[],
  config: BiometricPayrollConfig,
  defaultSchedule: BiometricSchedule,
  monthKey: string,
  todayKey: string
): PayrollRow[] {
  const monthEvents = events.filter((e) => casablancaDateKey(e.punchTime).startsWith(monthKey));
  const attendance = computeDailyAttendance(monthEvents, employees, defaultSchedule);
  const absencesByEmp = new Map(computeMonthlyAbsences(events, employees, leaves, holidays, monthKey, todayKey).map((r) => [r.empCode, r.dates.length]));

  const [year, month] = monthKey.split("-").map(Number);
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const rows: PayrollRow[] = [];
  for (const employee of employees) {
    if (employee.hidden) continue;
    const employeeLeaves = leaves.filter((l) => l.empCode === employee.empCode);

    let lateDays = 0;
    let lateSeconds = 0;
    let lateDeduction = 0;
    for (const row of attendance) {
      if (row.empCode !== employee.empCode || !row.isLate) continue;
      if (isOnLeave(row.date, employeeLeaves)) continue;
      if (isHoliday(row.date, holidays)) continue;
      lateDays += 1;
      lateSeconds += row.lateSeconds;
      lateDeduction += penaltyForLateMinutes(Math.floor(row.lateSeconds / 60), rules);
    }

    // Working days of the month covered by a leave — shown next to the
    // absence count so a low absence count for someone away all month reads
    // as "on leave", not "never misses a day".
    let leaveDays = 0;
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
      if (isWorkedDay(employee, dateKey) && isOnLeave(dateKey, employeeLeaves)) leaveDays += 1;
    }

    const absenceDays = absencesByEmp.get(employee.empCode) ?? 0;
    const absenceDeduction = absenceDays * config.absenceDeduction;
    const totalDeduction = lateDeduction + absenceDeduction;
    rows.push({
      empCode: employee.empCode,
      name: employee.name,
      color: employee.color,
      monthlySalary: employee.monthlySalary,
      lateDays,
      lateSeconds,
      lateDeduction,
      absenceDays,
      absenceDeduction,
      leaveDays,
      totalDeduction,
      netSalary: employee.monthlySalary === null ? null : employee.monthlySalary - totalDeduction,
    });
  }

  return rows.sort((a, b) => b.totalDeduction - a.totalDeduction || a.name.localeCompare(b.name));
}

/** "1 250,00 DH" — the page's single money formatter, so a salary, a
 * deduction and a net total all read the same way. */
export function formatDirham(amount: number): string {
  return `${amount.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
}
