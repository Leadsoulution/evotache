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
  color: string;
  hidden: boolean;
}

// Per-extension override stored via /api/calls/users — layered onto the
// auto-derived name/color below, and the only way a user gets excluded
// (hidden) from the picker/charts without touching call history.
export interface ThreeCxUserOverride {
  dn: string;
  name: string | null;
  color: string | null;
  hidden: boolean;
}

/** Internal 3CX users/extensions, derived straight from the synced call
 * data rather than a separate "list users" API call — 3CX's display names
 * for a real named extension consistently end in " (DN)" (e.g. "Commercial
 * P2 (111)"), which distinguishes a real user from a trunk/gateway leg or a
 * raw external caller number (neither of which matches that pattern).
 * `overrides` layers on any admin-set display name/color/hidden flag —
 * default color is assigned by dn order so it stays stable across
 * re-filters/re-sorts instead of depending on call counts. */
export function deriveInternalUsers(calls: PhoneCall[], overrides: ThreeCxUserOverride[] = []): InternalUser[] {
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
  const overrideByDn = new Map(overrides.map((o) => [o.dn, o]));
  return Array.from(byDn.entries())
    .map(([dn, autoName]) => ({ dn, autoName }))
    .sort((a, b) => a.dn.localeCompare(b.dn))
    .map(({ dn, autoName }, i) => {
      const override = overrideByDn.get(dn);
      return {
        dn,
        name: override?.name || autoName,
        color: override?.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
        hidden: override?.hidden ?? false,
      };
    });
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

const CALLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

// 3CX doesn't store the same subscriber's number identically on both legs:
// a missed inbound call's caller shows up international (+212614700516)
// while a later outbound call to the same person shows up local
// (0614700516) — same 9-digit subscriber number, different prefix
// (country code vs. local leading 0). Comparing the full digit string
// (confirmed live) missed the vast majority of real callbacks for exactly
// this reason, so this keeps only the last 9 digits — the subscriber
// number itself — which lines both formats up.
function normalizedNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
}

/** IDs of missed inbound calls ("Unanswered") that got followed up — an
 * outbound call placed to the same external number within 24h after it
 * rang. Neither 3CX nor this app track that link natively (every call is
 * an independent record with its own status), so it's derived here:
 * numbers are compared with formatting stripped (3CX doesn't always write
 * the same caller's number identically between an inbound leg and an
 * outbound one), and callers should pass the *full* call history rather
 * than whatever's currently filtered — narrowing to a single day would
 * otherwise hide a callback that happened the next day but is still
 * within the 24h window. */
export function computeHandledMissedCalls(calls: PhoneCall[]): Set<number> {
  const outboundTimesByNumber = new Map<string, number[]>();
  for (const c of calls) {
    if (c.direction !== "Outbound") continue;
    const key = normalizedNumber(c.destNumber);
    if (!key) continue;
    if (!outboundTimesByNumber.has(key)) outboundTimesByNumber.set(key, []);
    outboundTimesByNumber.get(key)!.push(new Date(c.startTime).getTime());
  }

  const handled = new Set<number>();
  for (const c of calls) {
    if (c.direction !== "Inbound" || c.status !== "Unanswered") continue;
    const key = normalizedNumber(c.sourceNumber);
    const candidates = key ? outboundTimesByNumber.get(key) : undefined;
    if (!candidates) continue;
    const missedAt = new Date(c.startTime).getTime();
    const wasCalledBack = candidates.some((t) => t > missedAt && t - missedAt <= CALLBACK_WINDOW_MS);
    if (wasCalledBack) handled.add(c.id);
  }
  return handled;
}

export function countByUser(calls: PhoneCall[], users: InternalUser[]): BarChartDatum[] {
  return users
    .filter((u) => !u.hidden)
    .map((u) => ({ key: u.dn, label: u.name, value: callsForUser(calls, u.dn).length, color: u.color }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}
