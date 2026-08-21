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
// workday; endTime/fridayBreakStart/fridayBreakEnd/saturdayEndTime shape
// which timestamps count as "within work hours" (see isWithinWorkHours in
// biometricStats.ts), used both for lateness and the Heures d'ouverture
// filter preset. Sunday isn't a workday.
export interface BiometricSchedule {
  startTime: string;
  endTime: string;
  fridayBreakStart: string;
  fridayBreakEnd: string;
  saturdayEndTime: string;
}
