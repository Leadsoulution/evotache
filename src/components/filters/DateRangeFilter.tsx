"use client";

import { useEffect, useRef, useState } from "react";
import { FilterTriggerButton } from "@/components/ui/FilterMenu";
import { cn } from "@/lib/cn";

interface DateRangeFilterProps {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 [color-scheme:light] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950 dark:[color-scheme:dark]";

function isoDateDaysFromToday(offset: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday-start week
  date.setDate(date.getDate() - diff);
  return date.toISOString().slice(0, 10);
}

function startOfMonth(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

const PRESETS: { label: string; from: () => string; to: () => string }[] = [
  { label: "Today", from: () => isoDateDaysFromToday(0), to: () => isoDateDaysFromToday(0) },
  { label: "This week", from: startOfWeek, to: () => isoDateDaysFromToday(6) },
  { label: "This month", from: startOfMonth, to: () => isoDateDaysFromToday(30) },
  { label: "Overdue", from: () => isoDateDaysFromToday(-365), to: () => isoDateDaysFromToday(-1) },
];

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = Boolean(from || to);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const label = active ? `${from ?? "…"} → ${to ?? "…"}` : "Date range";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Filter by date range">
        <FilterTriggerButton label={label} active={active} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 flex w-64 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.from(), preset.to())}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">From</span>
            <input type="date" value={from ?? ""} onChange={(event) => onChange(event.target.value || null, to)} className={inputClass} />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">To</span>
            <input type="date" value={to ?? ""} onChange={(event) => onChange(from, event.target.value || null)} className={inputClass} />
          </label>

          <button
            type="button"
            onClick={() => onChange(null, null)}
            disabled={!active}
            className={cn(
              "self-start text-xs font-medium text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline dark:text-indigo-400 dark:disabled:text-slate-600"
            )}
          >
            Clear range
          </button>
        </div>
      )}
    </div>
  );
}
