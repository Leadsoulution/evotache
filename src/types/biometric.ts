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

// The "on time" cutoff used to flag late arrivals — startTime applies every
// day (including Friday's morning), fridayBreakStart/End only affect the
// Heures d'ouverture filter preset, not lateness.
export interface BiometricSchedule {
  startTime: string;
  endTime: string;
  fridayBreakStart: string;
  fridayBreakEnd: string;
}
