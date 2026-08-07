"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

// Same modal chrome as CallDateRangePicker (which mirrors Ads' MetaDateRangePicker) —
// left preset list, Annuler/Mettre à jour footer — but the right panel is a
// simple "De/À" time range instead of a calendar, since time-of-day doesn't
// need one.
type PresetKey = "all" | "business_hours" | "morning" | "afternoon" | "evening";

const BUSINESS_HOURS_LABEL = "Heures d'ouverture (9h30–19h, ven. 9h30–13h/15h–19h)";

// "business_hours" isn't a simple from/to range — Friday splits around the
// midday break — so it's filtered by isWithinBusinessHours (CallsView.tsx)
// instead of a plain range, signaled via the 3rd onApply argument.
const RANGE_PRESETS: { key: Exclude<PresetKey, "business_hours">; label: string; from: string; to: string }[] = [
  { key: "all", label: "Toute la journée", from: "", to: "" },
  { key: "morning", label: "Matin (6h–12h)", from: "06:00", to: "12:00" },
  { key: "afternoon", label: "Après-midi (12h–18h)", from: "12:00", to: "18:00" },
  { key: "evening", label: "Soir (18h–00h)", from: "18:00", to: "23:59" },
];

export interface CallTimeRange {
  from: string;
  to: string;
}

interface CallTimeRangePickerProps {
  open: boolean;
  onClose: () => void;
  onApply: (range: CallTimeRange, label: string, businessHours?: boolean) => void;
}

export function CallTimeRangePicker({ open, onClose, onApply }: CallTimeRangePickerProps) {
  const [selectedKey, setSelectedKey] = useState<PresetKey | "custom">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelectedKey("all");
      setFrom("");
      setTo("");
    }
  }

  if (!open) return null;

  function selectRangePreset(preset: (typeof RANGE_PRESETS)[number]) {
    setSelectedKey(preset.key);
    setFrom(preset.from);
    setTo(preset.to);
  }

  function selectBusinessHours() {
    setSelectedKey("business_hours");
    setFrom("");
    setTo("");
  }

  function handleApply() {
    if (selectedKey === "business_hours") {
      onApply({ from: "", to: "" }, BUSINESS_HOURS_LABEL, true);
    } else if (selectedKey === "custom") {
      const label = from || to ? `${from || "00:00"} – ${to || "23:59"}` : "Toute la journée";
      onApply({ from, to }, label);
    } else {
      const preset = RANGE_PRESETS.find((p) => p.key === selectedKey) ?? RANGE_PRESETS[0];
      onApply({ from: preset.from, to: preset.to }, preset.label);
    }
    onClose();
  }

  const currentLabel =
    selectedKey === "custom" ? "Plage personnalisée" : selectedKey === "business_hours" ? BUSINESS_HOURS_LABEL : RANGE_PRESETS.find((p) => p.key === selectedKey)?.label;

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
        className="flex max-h-[90vh] w-full max-w-md animate-scale-in flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:overflow-hidden"
      >
        <div className="w-full shrink-0 overflow-y-auto border-b border-slate-100 p-2 dark:border-slate-800 sm:w-48 sm:border-b-0 sm:border-r">
          <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
            <input
              type="radio"
              name="call-time-preset"
              checked={selectedKey === "business_hours"}
              onChange={selectBusinessHours}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 border-slate-300 text-indigo-600 dark:border-slate-600"
            />
            <span>
              Heures d&apos;ouverture
              <span className="block text-xs text-slate-400">9h30–19h · ven. 9h30–13h / 15h–19h</span>
            </span>
          </label>
          {RANGE_PRESETS.map((preset) => (
            <label
              key={preset.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <input
                type="radio"
                name="call-time-preset"
                checked={selectedKey === preset.key}
                onChange={() => selectRangePreset(preset)}
                className="h-3.5 w-3.5 border-slate-300 text-indigo-600 dark:border-slate-600"
              />
              {preset.label}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
            <input
              type="radio"
              name="call-time-preset"
              checked={selectedKey === "custom"}
              onChange={() => setSelectedKey("custom")}
              className="h-3.5 w-3.5 border-slate-300 text-indigo-600 dark:border-slate-600"
            />
            Personnalisé
          </label>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Plage horaire</p>
          <div className={cn("flex items-center gap-2", selectedKey === "business_hours" && "pointer-events-none opacity-40")}>
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
              De
              <input
                type="time"
                value={from}
                onChange={(event) => {
                  setSelectedKey("custom");
                  setFrom(event.target.value);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
              À
              <input
                type="time"
                value={to}
                onChange={(event) => {
                  setSelectedKey("custom");
                  setTo(event.target.value);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </label>
          </div>
          {selectedKey === "business_hours" && (
            <p className="text-xs text-slate-400">Le vendredi est filtré séparément (9h30–13h et 15h–19h) pour tenir compte de la pause de midi.</p>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
            <span>{currentLabel}</span>
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
