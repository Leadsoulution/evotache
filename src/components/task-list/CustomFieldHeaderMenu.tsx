"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DropdownOptionsEditor } from "@/components/ui/DropdownOptionsEditor";
import { ChevronDownIcon, TrashIcon } from "@/components/ui/icons";
import type { CustomFieldDef, CustomFieldOption } from "@/types/customField";

interface CustomFieldHeaderMenuProps {
  field: CustomFieldDef;
  typeLabel: string;
  accentColor: string;
  onRename: (name: string) => void;
  onSetOptions: (options: CustomFieldOption[]) => void;
  onDelete: () => void;
}

export function CustomFieldHeaderMenu({ field, typeLabel, accentColor, onRename, onSetOptions, onDelete }: CustomFieldHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [pendingDelete, setPendingDelete] = useState(false);
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{field.name}</span>
          <span className="block text-[10px] font-normal normal-case text-slate-400">{typeLabel}</span>
        </span>
        <ChevronDownIcon className="h-3 w-3 shrink-0 text-slate-400" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Edit column"
            tabIndex={-1}
            onKeyDown={onPanelKeyDown}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-[95] w-72 animate-scale-in rounded-lg border border-slate-200 bg-white p-3 shadow-xl focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="mb-1 text-xs font-medium text-slate-400">Column name</p>
            <input
              defaultValue={field.name}
              onBlur={(event) => {
                const trimmed = event.target.value.trim();
                if (trimmed && trimmed !== field.name) onRename(trimmed);
                else event.target.value = field.name;
              }}
              onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
              aria-label="Rename column"
              className="mb-3 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
            />

            {field.type === "select" && (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-medium text-slate-400">Options</p>
                <DropdownOptionsEditor options={field.options} onChange={onSetOptions} />
              </div>
            )}

            <button
              type="button"
              onClick={() => setPendingDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete column
            </button>
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={pendingDelete}
        title="Delete this column?"
        description={`"${field.name}" and its values on every task will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          onDelete();
          setPendingDelete(false);
          setOpen(false);
        }}
        onCancel={() => setPendingDelete(false)}
      />
    </>
  );
}
