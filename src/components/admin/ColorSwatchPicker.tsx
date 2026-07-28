"use client";

import { useEffect, useRef, useState } from "react";
import { COLOR_PALETTE } from "@/config/colorPalette";
import { cn } from "@/lib/cn";

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-5 w-5 shrink-0 rounded-full ring-2 ring-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:ring-slate-900"
        style={{ backgroundColor: value }}
        aria-label="Change color"
        aria-expanded={open}
      />
      {open && (
        <div className="absolute left-0 top-7 z-20 grid w-36 grid-cols-5 gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
              className={cn("h-5 w-5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500", value === color && "ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900")}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
