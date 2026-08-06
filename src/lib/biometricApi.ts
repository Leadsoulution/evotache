const TIMEZONE = "Africa/Casablanca";

// ZKBio Time returns naive "YYYY-MM-DD HH:mm:ss" timestamps with no offset
// attached — they're the device's own wall-clock reading, in Morocco time.
// Converts that to a real UTC Date using the IANA zone (which also handles
// Morocco's own Ramadan DST reversion) rather than assuming the server
// process's local timezone matches.
export function casablancaWallClockToUtc(naive: string): Date {
  const isoLike = naive.trim().replace(" ", "T");
  const guess = new Date(`${isoLike}Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(guess);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const casablancaDigitsAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = casablancaDigitsAsUtc - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

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
