import { COLOR_PALETTE } from "@/config/colorPalette";
import type { BarChartDatum } from "@/components/stats/BarChart";
import type { PhoneCall } from "@/types/call";

// 3CX's real vocabulary (confirmed live against synced data) — "Unanswered"
// is what this app calls "missed", not "Missed".
export const STATUS_LABEL: Record<string, string> = {
  Answered: "Répondu",
  Unanswered: "Manqué",
  Waiting: "En attente",
  Redirected: "Redirigé",
};

export const STATUS_BADGE: Record<string, string> = {
  Answered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Unanswered: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  Waiting: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Redirected: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const DIRECTION_LABEL: Record<string, string> = {
  Inbound: "Entrant",
  Outbound: "Sortant",
  Internal: "Interne",
};

export interface InternalUser {
  dn: string;
  name: string;
}

/** Internal 3CX users/extensions, derived straight from the synced call
 * data rather than a separate "list users" API call — 3CX's display names
 * for a real named extension consistently end in " (DN)" (e.g. "Commercial
 * P2 (111)"), which distinguishes a real user from a trunk/gateway leg or a
 * raw external caller number (neither of which matches that pattern). */
export function deriveInternalUsers(calls: PhoneCall[]): InternalUser[] {
  const byDn = new Map<string, string>();
  const consider = (dn: string, name: string | null) => {
    if (!dn || !name) return;
    const match = /^(.*)\s\(\d+\)$/.exec(name);
    if (!match) return;
    if (!byDn.has(dn)) byDn.set(dn, match[1].trim());
  };
  for (const call of calls) {
    consider(call.sourceDn, call.sourceName);
    consider(call.destDn, call.destName);
  }
  return Array.from(byDn.entries())
    .map(([dn, name]) => ({ dn, name }))
    .sort((a, b) => a.dn.localeCompare(b.dn));
}

export function callsForUser(calls: PhoneCall[], dn: string): PhoneCall[] {
  return calls.filter((c) => c.sourceDn === dn || c.destDn === dn);
}

export function countByStatus(calls: PhoneCall[]): BarChartDatum[] {
  const counts = new Map<string, number>();
  for (const c of calls) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([status, value], i) => ({ key: status, label: STATUS_LABEL[status] ?? status, value, color: COLOR_PALETTE[i % COLOR_PALETTE.length] }))
    .sort((a, b) => b.value - a.value);
}

export function countByDirection(calls: PhoneCall[]): BarChartDatum[] {
  const counts = new Map<string, number>();
  for (const c of calls) counts.set(c.direction, (counts.get(c.direction) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([direction, value], i) => ({ key: direction, label: DIRECTION_LABEL[direction] ?? direction, value, color: COLOR_PALETTE[i % COLOR_PALETTE.length] }))
    .sort((a, b) => b.value - a.value);
}

export function countByUser(calls: PhoneCall[], users: InternalUser[]): BarChartDatum[] {
  return users
    .map((u, i) => ({ key: u.dn, label: u.name, value: callsForUser(calls, u.dn).length, color: COLOR_PALETTE[i % COLOR_PALETTE.length] }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}
