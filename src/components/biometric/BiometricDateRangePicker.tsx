"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { casablancaDateKey } from "@/lib/casablancaTime";

// Mirrors CallDateRangePicker (src/components/calls/CallDateRangePicker.tsx),
// which itself mirrors Ads' MetaDateRangePicker design — same left preset
// list + two-month calendar + Annuler/Mettre à jour footer.
type PresetKey = "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" | "this_month" | "last_month" | "all";

const PRESET_LIST: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "yesterday", label: "Hier" },
  { key: "last_7d", label: "7 derniers jours" },
  { key: "last_14d", label: "14 derniers jours" },
  { key: "last_30d", label: "30 derniers jours" },
  { key: "this_month", label: "Ce mois-ci" },
  { key: "last_month", label: "Mois dernier" },
  { key: "all", label: "Toutes les dates" },
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

function presetRange(key: PresetKey, now: Date): { since: Date; until: Date } | null {
  const today = startOfDay(now);
  switch (key) {
    case "today":
      return { since: today, until: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { since: y, until: y };
    }
    case "last_7d":
      return { since: addDays(today, -6), until: today };
    case "last_14d":
      return { since: addDays(today, -13), until: today };
    case "last_30d":
      return { since: addDays(today, -29), until: today };
    case "this_month":
      return { since: startOfMonth(today), until: today };
    case "last_month": {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { since: startOfMonth(lastMonthDate), until: endOfMonth(lastMonthDate) };
    }
    case "all":
      return null;
  }
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

export interface BiometricDateRange {
  from: string | null;
  to: string | null;
}

interface BiometricDateRangePickerProps {
  open: boolean;
  onClose: () => void;
  onApply: (range: BiometricDateRange, label: string) => void;
}

export function BiometricDateRangePicker({ open, onClose, onApply }: BiometricDateRangePickerProps) {
  // Today's real Casablanca calendar date, not the viewer's own PC/browser
  // timezone (some office PCs have theirs set wrong) — built as a local
  // midnight Date from those Y/M/D digits so the existing calendar-day
  // arithmetic below (which is plain calendar math, not a timezone
  // conversion) works unchanged from there.
  const [todayYear, todayMonth, todayDay] = casablancaDateKey(new Date()).split("-").map(Number);
  const now = new Date(todayYear, todayMonth - 1, todayDay);
  const [selectedKey, setSelectedKey] = useState<PresetKey | "custom">("all");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [rightCursor, setRightCursor] = useState<Date>(startOfMonth(now));
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelectedKey("all");
      setRangeStart(null);
      setRangeEnd(null);
      setRightCursor(startOfMonth(now));
    }
  }

  if (!open) return null;

  const leftCursor = addMonths(rightCursor, -1);

  function selectPreset(key: PresetKey) {
    setSelectedKey(key);
    const range = presetRange(key, now);
    setRangeStart(range?.since ?? null);
    setRangeEnd(range?.until ?? null);
    setRightCursor(startOfMonth(range?.until ?? now));
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
    if (selectedKey === "all" || !rangeStart) {
      onApply({ from: null, to: null }, "Toutes les dates");
    } else if (selectedKey === "custom") {
      const end = rangeEnd ?? rangeStart;
      onApply({ from: toDateStr(rangeStart), to: toDateStr(end) }, `${formatFr(rangeStart)} – ${formatFr(end)}`);
    } else {
      const end = rangeEnd ?? rangeStart;
      const preset = PRESET_LIST.find((p) => p.key === selectedKey);
      onApply({ from: toDateStr(rangeStart), to: toDateStr(end) }, preset?.label ?? selectedKey);
    }
    onClose();
  }

  function renderMonth(cursor: Date) {
    const weeks = monthMatrix(cursor);
    return (
      <div className="min-w-[240px] flex-1">
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
        className="flex max-h-[90vh] w-full max-w-[52rem] animate-scale-in flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:overflow-hidden"
      >
        <div className="w-full shrink-0 overflow-y-auto border-b border-slate-100 p-2 dark:border-slate-800 sm:w-48 sm:border-b-0 sm:border-r">
          {PRESET_LIST.map((preset) => (
            <label
              key={preset.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <input
                type="radio"
                name="biometric-date-preset"
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
              aria-label="Mois précédent"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div className="flex flex-1 justify-center gap-4 overflow-x-auto">
              <div className="hidden sm:block">{renderMonth(leftCursor)}</div>
              {renderMonth(rightCursor)}
            </div>
            <button
              type="button"
              onClick={() => setRightCursor((c) => addMonths(c, 1))}
              aria-label="Mois suivant"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
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
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
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
