import type { RecurrenceRule } from "@/types/task";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function ordinal(n: number): string {
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return `${n}st`;
  if (lastDigit === 2 && lastTwoDigits !== 12) return `${n}nd`;
  if (lastDigit === 3 && lastTwoDigits !== 13) return `${n}rd`;
  return `${n}th`;
}

/** Computes the next occurrence date strictly after `fromDate`, per the rule. */
export function computeNextOccurrence(rule: RecurrenceRule, fromDate: Date): Date {
  const from = startOfDay(fromDate);
  const interval = Math.max(1, Math.floor(rule.interval) || 1);

  if (rule.frequency === "daily") {
    return addDays(from, interval);
  }

  if (rule.frequency === "monthly") {
    const day = rule.dayOfMonth ?? from.getDate();
    const next = new Date(from.getFullYear(), from.getMonth() + interval, 1);
    const lastDayOfNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDayOfNextMonth));
    return next;
  }

  // Weekly — anchor "week 0" at the Monday on/before `from`, so an interval > 1
  // ("every 2 weeks") skips the right number of weeks between occurrences.
  const days = rule.daysOfWeek.length ? Array.from(new Set(rule.daysOfWeek)).sort((a, b) => a - b) : [from.getDay()];
  const anchorMonday = addDays(from, -((from.getDay() + 6) % 7));
  for (let offset = 1; offset <= interval * 7 * 8; offset++) {
    const candidate = addDays(from, offset);
    if (!days.includes(candidate.getDay())) continue;
    const candidateMonday = addDays(candidate, -((candidate.getDay() + 6) % 7));
    const weeksBetween = Math.round((candidateMonday.getTime() - anchorMonday.getTime()) / (7 * 86400000));
    if (weeksBetween % interval === 0) return candidate;
  }
  return addDays(from, 7 * interval);
}

export function describeRecurrence(rule: RecurrenceRule | null): string {
  if (!rule) return "Does not repeat";
  const interval = Math.max(1, Math.floor(rule.interval) || 1);

  if (rule.frequency === "daily") {
    return interval === 1 ? "Every day" : `Every ${interval} days`;
  }

  if (rule.frequency === "monthly") {
    const dayLabel = rule.dayOfMonth ? `on the ${ordinal(rule.dayOfMonth)}` : "on the same day";
    return interval === 1 ? `Every month ${dayLabel}` : `Every ${interval} months ${dayLabel}`;
  }

  const days = rule.daysOfWeek.length ? [...rule.daysOfWeek].sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]) : [];
  const dayList = days.length ? days.join(", ") : "the same day";
  return interval === 1 ? `Every ${dayList}` : `Every ${interval} weeks on ${dayList}`;
}
