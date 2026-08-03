"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { MetaDatePreset, MetaDateRangeParam } from "@/config/metaAds";

// "today_yesterday" mirrors Meta's own picker but isn't a real date_preset
// value Meta's API accepts — it's sent as an explicit {since, until} range instead.
type PresetKey = MetaDatePreset | "today_yesterday";

const PRESET_LIST: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "yesterday", label: "Hier" },
  { key: "today_yesterday", label: "Aujourd'hui et hier" },
  { key: "last_7d", label: "7 derniers jours" },
  { key: "last_14d", label: "14 derniers jours" },
  { key: "last_28d", label: "28 derniers jours" },
  { key: "last_30d", label: "30 derniers jours" },
  { key: "this_week_mon_sun", label: "Cette semaine" },
  { key: "last_week_mon_sun", label: "Semaine dernière" },
  { key: "this_month", label: "Ce mois-ci" },
  { key: "last_month", label: "Dernier mois" },
  { key: "maximum", label: "Maximum" },
];

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  return addDays(x, -day);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && toDateStr(a) === toDateStr(b);
}

function presetRange(key: PresetKey, now: Date): { since: Date; until: Date } {
  const today = startOfDay(now);
  switch (key) {
    case "today":
      return { since: today, until: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { since: y, until: y };
    }
    case "today_yesterday":
      return { since: addDays(today, -1), until: today };
    case "last_7d":
      return { since: addDays(today, -7), until: addDays(today, -1) };
    case "last_14d":
      return { since: addDays(today, -14), until: addDays(today, -1) };
    case "last_28d":
      return { since: addDays(today, -28), until: addDays(today, -1) };
    case "last_30d":
      return { since: addDays(today, -30), until: addDays(today, -1) };
    case "this_week_mon_sun":
      return { since: startOfWeekMonday(today), until: today };
    case "last_week_mon_sun": {
      const start = addDays(startOfWeekMonday(today), -7);
      return { since: start, until: addDays(start, 6) };
    }
    case "this_month":
      return { since: startOfMonth(today), until: today };
    case "last_month": {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { since: startOfMonth(lastMonthDate), until: endOfMonth(lastMonthDate) };
    }
    case "maximum":
      return { since: new Date(2015, 0, 1), until: today };
  }
}

function presetToParam(key: PresetKey, now: Date): MetaDateRangeParam {
  if (key === "today_yesterday") {
    const { since, until } = presetRange(key, now);
    return { since: toDateStr(since), until: toDateStr(until) };
  }
  return key;
}

function monthMatrix(cursor: Date): (Date | null)[][] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = endOfMonth(cursor).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

interface MetaDateRangePickerProps {
  open: boolean;
  onClose: () => void;
  onApply: (range: MetaDateRangeParam, label: string) => void;
}

export function MetaDateRangePicker({ open, onClose, onApply }: MetaDateRangePickerProps) {
  const now = new Date();
  const [selectedKey, setSelectedKey] = useState<PresetKey | "custom">("last_30d");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [rightCursor, setRightCursor] = useState<Date>(startOfMonth(now));
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const { since, until } = presetRange("last_30d", now);
      setRangeStart(since);
      setRangeEnd(until);
      setSelectedKey("last_30d");
      setRightCursor(startOfMonth(until));
    }
  }

  if (!open) return null;

  const leftCursor = addMonths(rightCursor, -1);

  function selectPreset(key: PresetKey) {
    const { since, until } = presetRange(key, now);
    setSelectedKey(key);
    setRangeStart(since);
    setRangeEnd(until);
    setRightCursor(startOfMonth(until));
  }

  function clickDay(day: Date) {
    setSelectedKey("custom");
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(day);
      setRangeEnd(null);
      return;
    }
    if (day < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(day);
    } else {
      setRangeEnd(day);
    }
  }

  function isInRange(day: Date): boolean {
    if (!rangeStart) return false;
    const end = rangeEnd ?? rangeStart;
    return day >= rangeStart && day <= end;
  }

  function handleApply() {
    if (!rangeStart) return;
    const end = rangeEnd ?? rangeStart;
    if (selectedKey === "custom") {
      onApply({ since: toDateStr(rangeStart), until: toDateStr(end) }, `${formatFr(rangeStart)} – ${formatFr(end)}`);
    } else {
      const preset = PRESET_LIST.find((p) => p.key === selectedKey);
      onApply(presetToParam(selectedKey, now), preset?.label ?? selectedKey);
    }
    onClose();
  }

  function renderMonth(cursor: Date) {
    const weeks = monthMatrix(cursor);
    return (
      <div className="flex-1">
        <p className="mb-2 text-center text-sm font-medium text-slate-700 dark:text-slate-200">
          {cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </p>
        <table className="w-full text-center text-xs">
          <thead>
            <tr className="text-slate-400">
              {WEEKDAY_LABELS.map((w) => (
                <th key={w} className="px-1 py-1 font-normal">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map((day, j) => {
                  if (!day) return <td key={j} className="p-0.5" />;
                  const inRange = isInRange(day);
                  const isEndpoint = sameDay(day, rangeStart) || sameDay(day, rangeEnd ?? rangeStart);
                  return (
                    <td key={j} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => clickDay(day)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full tabular-nums",
                          isEndpoint
                            ? "bg-indigo-600 font-semibold text-white"
                            : inRange
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        )}
                      >
                        {day.getDate()}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex animate-fade-in items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-2xl animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="w-48 shrink-0 overflow-y-auto border-r border-slate-100 p-2 dark:border-slate-800">
          {PRESET_LIST.map((preset) => (
            <label
              key={preset.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <input
                type="radio"
                name="meta-date-preset"
                checked={selectedKey === preset.key}
                onChange={() => selectPreset(preset.key)}
                className="h-3.5 w-3.5 border-slate-300 text-indigo-600 dark:border-slate-600"
              />
              {preset.label}
            </label>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setRightCursor((c) => addMonths(c, -1))}
              aria-label="Previous month"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div className="flex flex-1 gap-6">
              {renderMonth(leftCursor)}
              {renderMonth(rightCursor)}
            </div>
            <button
              type="button"
              onClick={() => setRightCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
            <span>{selectedKey === "custom" ? "Période personnalisée" : PRESET_LIST.find((p) => p.key === selectedKey)?.label}</span>
            {rangeStart && (
              <span className="text-slate-400">
                {formatFr(rangeStart)} – {formatFr(rangeEnd ?? rangeStart)}
              </span>
            )}
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!rangeStart}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mettre à jour
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
