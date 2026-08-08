// Moved to its own module — casablancaWallClockToUtc is also needed
// client-side now (computing lateness against Casablanca time regardless
// of the viewer's own PC timezone), not just here during ingestion.
// Re-exported so existing importers of this file don't need to change.
import { casablancaWallClockToUtc } from "@/lib/casablancaTime";
export { casablancaWallClockToUtc };

// The exact shape ZKBio Time's own /iclock/api/transactions/ returns per
// row — the local push script forwards these completely unprocessed, so
// all the device-specific parsing stays here in one place instead of also
// living in the script (which would need redeploying to fix a parsing bug).
export interface RawTransaction {
  id: number;
  emp_code: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
  position: string | null;
  punch_time: string;
  punch_state: string;
  punch_state_display: string;
  verify_type_display: string | null;
  terminal_alias: string | null;
}

export interface BiometricEventEntry {
  externalId: string;
  empCode: string;
  employeeName: string;
  department: string | null;
  position: string | null;
  punchTime: Date;
  punchState: string;
  punchStateLabel: string;
  verifyType: string | null;
  terminalAlias: string | null;
}

export function toBiometricEventEntry(row: RawTransaction): BiometricEventEntry {
  const employeeName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.emp_code;
  return {
    externalId: String(row.id),
    empCode: row.emp_code,
    employeeName,
    department: row.department,
    position: row.position,
    punchTime: casablancaWallClockToUtc(row.punch_time),
    punchState: row.punch_state,
    punchStateLabel: row.punch_state_display,
    verifyType: row.verify_type_display,
    terminalAlias: row.terminal_alias,
  };
}
