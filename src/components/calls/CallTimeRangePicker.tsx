"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

// Same modal chrome as CallDateRangePicker (which mirrors Ads' MetaDateRangePicker) —
// left preset list, Annuler/Mettre à jour footer — but the right panel is a
// simple "De/À" time range instead of a calendar, since time-of-day doesn't
// need one.
type PresetKey = "all" | "business" | "morning" | "afternoon" | "evening";

const PRESET_LIST: { key: PresetKey; label: string; from: string; to: string }[] = [
  { key: "all", label: "Toute la journée", from: "", to: "" },
  { key: "business", label: "Heures de bureau (9h–18h)", from: "09:00", to: "18:00" },
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
  onApply: (range: CallTimeRange, label: string) => void;
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

  function selectPreset(preset: (typeof PRESET_LIST)[number]) {
    setSelectedKey(preset.key);
    setFrom(preset.from);
    setTo(preset.to);
  }

  function handleApply() {
    if (selectedKey === "custom") {
      const label = from || to ? `${from || "00:00"} – ${to || "23:59"}` : "Toute la journée";
      onApply({ from, to }, label);
    } else {
      const preset = PRESET_LIST.find((p) => p.key === selectedKey) ?? PRESET_LIST[0];
      onApply({ from: preset.from, to: preset.to }, preset.label);
    }
    onClose();
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
        className="flex max-h-[90vh] w-full max-w-md animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="w-44 shrink-0 overflow-y-auto border-r border-slate-100 p-2 dark:border-slate-800">
          {PRESET_LIST.map((preset) => (
            <label
              key={preset.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <input
                type="radio"
                name="call-time-preset"
                checked={selectedKey === preset.key}
                onChange={() => selectPreset(preset)}
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
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
            <span>{selectedKey === "custom" ? "Plage personnalisée" : PRESET_LIST.find((p) => p.key === selectedKey)?.label}</span>
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
