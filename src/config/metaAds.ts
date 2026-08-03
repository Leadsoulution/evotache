// Client-safe constants shared between src/lib/metaApi.ts (server-only —
// pulls in the Prisma client) and any UI that needs the same date-range
// options, without pulling server-only code into the client bundle.

// Meta's valid insights date_preset values (it renamed "lifetime" to "maximum").
export type MetaDatePreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "this_week_mon_sun"
  | "last_week_mon_sun"
  | "this_month"
  | "last_month"
  | "maximum";

export const META_DATE_PRESET_OPTIONS: { value: MetaDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_14d", label: "Last 14 days" },
  { value: "last_28d", label: "Last 28 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "this_week_mon_sun", label: "This week" },
  { value: "last_week_mon_sun", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "maximum", label: "All time" },
];

export const DEFAULT_META_DATE_PRESET: MetaDatePreset = "maximum";

export interface MetaCustomDateRange {
  since: string; // "YYYY-MM-DD"
  until: string; // "YYYY-MM-DD"
}

export type MetaDateRangeParam = MetaDatePreset | MetaCustomDateRange;

export function isCustomDateRange(value: MetaDateRangeParam): value is MetaCustomDateRange {
  return typeof value === "object" && value !== null;
}
