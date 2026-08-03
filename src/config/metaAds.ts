// Client-safe constants shared between src/lib/metaApi.ts (server-only —
// pulls in the Prisma client) and any UI that needs the same date-range
// options, without pulling server-only code into the client bundle.

// Meta's valid insights date_preset values (it renamed "lifetime" to "maximum").
export type MetaDatePreset = "today" | "last_7d" | "last_14d" | "last_30d" | "this_month" | "last_month" | "maximum";

export const META_DATE_PRESET_OPTIONS: { value: MetaDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_14d", label: "Last 14 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "maximum", label: "All time" },
];

export const DEFAULT_META_DATE_PRESET: MetaDatePreset = "maximum";
