import { authorizedFetch } from "@/lib/biometricAuth";

const PAGE_SIZE = 500;
const TIMEZONE = "Africa/Casablanca";

// ZKBio Time returns naive "YYYY-MM-DD HH:mm:ss" timestamps with no offset
// attached — they're the device's own wall-clock reading, in Morocco time.
// Converts that to a real UTC Date using the IANA zone (which also handles
// Morocco's own Ramadan DST reversion) rather than assuming the server
// process's local timezone matches.
function casablancaWallClockToUtc(naive: string): Date {
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

function formatCasablancaWallClock(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

interface RawTransaction {
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

function toBiometricEventEntry(row: RawTransaction): BiometricEventEntry {
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

async function paginatedGet<T>(path: string, extraParams: Record<string, string>): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({ ...extraParams, page: String(page), page_size: String(PAGE_SIZE) });
    const response = await authorizedFetch(`${path}?${params.toString()}`);
    if (!response.ok) throw new Error(`Requête biométrique échouée (${response.status}): ${await response.text()}`);
    const data = (await response.json()) as { data: T[] };
    const rows = data.data ?? [];
    results.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    page += 1;
  }
  return results;
}

export async function listTransactions(startTime: Date, endTime: Date): Promise<BiometricEventEntry[]> {
  const rows = await paginatedGet<RawTransaction>("/iclock/api/transactions/", {
    start_time: formatCasablancaWallClock(startTime),
    end_time: formatCasablancaWallClock(endTime),
  });
  return rows.map(toBiometricEventEntry);
}
