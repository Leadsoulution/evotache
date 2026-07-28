"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, HashIcon, ImageIcon, LinkIcon, PlusIcon, SelectIcon, TextIcon, VideoIcon } from "@/components/ui/icons";
import { randomPaletteColor } from "@/config/colorPalette";
import { generateId } from "@/lib/id";
import { cn } from "@/lib/cn";
import type { PurchaseColumnType, PurchaseDropdownOption } from "@/types/purchase";

interface AddColumnPopoverProps {
  onAdd: (input: { name: string; type: PurchaseColumnType; options: PurchaseDropdownOption[] }) => Promise<boolean>;
}

type IconComponent = typeof TextIcon;

const TYPE_OPTIONS: { value: PurchaseColumnType; label: string; icon: IconComponent }[] = [
  { value: "text", label: "Text", icon: TextIcon },
  { value: "number", label: "Number", icon: HashIcon },
  { value: "dropdown", label: "Dropdown", icon: SelectIcon },
  { value: "date", label: "Date", icon: CalendarIcon },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "video", label: "Video", icon: VideoIcon },
  { value: "link", label: "Link", icon: LinkIcon },
];

export function AddColumnPopover({ onAdd }: AddColumnPopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PurchaseColumnType>("text");
  const [optionsDraft, setOptionsDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 300);
    setPosition({ top: rect.bottom + 6, left: Math.max(8, left) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function onPanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function reset() {
    setName("");
    setType("text");
    setOptionsDraft("");
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const options: PurchaseDropdownOption[] = optionsDraft
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .map((label) => ({ id: generateId("option"), label, color: randomPaletteColor() }));
    const success = await onAdd({ name: trimmed, type, options });
    setSubmitting(false);
    if (success) {
      reset();
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add column"
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
      >
        <PlusIcon className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Add column"
            tabIndex={-1}
            onKeyDown={onPanelKeyDown}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-[95] w-72 animate-scale-in rounded-lg border border-slate-200 bg-white p-3 shadow-xl focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">New column</p>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
              placeholder="Column name"
              aria-label="Column name"
              className="mb-2 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
            />

            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    aria-pressed={type === opt.value}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] font-medium",
                      type === opt.value
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {type === "dropdown" && (
              <input
                value={optionsDraft}
                onChange={(event) => setOptionsDraft(event.target.value)}
                placeholder="Options, comma-separated"
                aria-label="Dropdown options, comma-separated"
                className="mb-2 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
              />
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || submitting}
              className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add column"}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
