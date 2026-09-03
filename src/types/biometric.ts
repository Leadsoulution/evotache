export interface BiometricEvent {
  id: number;
  externalId: string;
  empCode: string;
  employeeName: string;
  department: string | null;
  position: string | null;
  punchTime: string;
  punchState: string;
  punchStateLabel: string;
  verifyType: string | null;
  terminalAlias: string | null;
  createdAt: string;
}

// The weekly work-hours window — startTime is the "on time" cutoff every
// workday; endTime/lunchBreakStart/lunchBreakEnd/fridayBreakStart/
// fridayBreakEnd/saturdayEndTime shape which timestamps count as "within
// work hours" (see isWithinWorkHours in biometricStats.ts), used both for
// lateness and the Heures d'ouverture filter preset. Monday-Thursday and
// Saturday are split around the lunch break; Friday around its own
// (longer) prayer break instead. Sunday isn't a workday.
export interface BiometricSchedule {
  startTime: string;
  endTime: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  fridayBreakStart: string;
  fridayBreakEnd: string;
  saturdayEndTime: string;
}

/** A booked leave period (congé) for one employee. `startDate`/`endDate`
 * are inclusive "YYYY-MM-DD" Casablanca calendar days — a single-day leave
 * has both equal. Days inside a leave never count as an absence. */
export interface BiometricLeave {
  id: string;
  empCode: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
}

/** How much one unjustified absent day costs, in DH. Lateness is docked
 * separately by the tiered rules below. */
export interface BiometricPayrollConfig {
  absenceDeduction: number;
}

/** "Arriving at least `fromMinutes` late costs `amount` DH." A late day is
 * charged by the single highest tier it reaches, never the sum of the tiers
 * below it (see computePayroll in biometricStats.ts). */
export interface BiometricLatePenaltyRule {
  id: string;
  fromMinutes: number;
  amount: number;
}

/** A company-wide public holiday (jour férié) — unlike BiometricLeave, not
 * tied to one empCode: it excuses everyone's absence/lateness that day. */
export interface BiometricHoliday {
  id: string;
  date: string;
  name: string;
}
