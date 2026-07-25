"use client";

import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { randomPaletteColor } from "@/config/colorPalette";
import { PlusIcon, SortIcon, TrashIcon } from "@/components/ui/icons";

interface OptionItem {
  id: string;
  label: string;
  color: string;
}

interface EditableOptionListProps {
  items: OptionItem[];
  onAdd: (input: { label: string; color: string }) => Promise<boolean>;
  onEdit: (id: string, patch: { label?: string; color?: string }) => Promise<void>;
  onRemove: (id: string) => Promise<boolean>;
  onMove: (id: string, direction: 1 | -1) => Promise<void>;
  addPlaceholder: string;
}

export function EditableOptionList({ items, onAdd, onEdit, onRemove, onMove, addPlaceholder }: EditableOptionListProps) {
  const [draft, setDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleAdd() {
    const label = draft.trim();
    if (!label) return;
    const success = await onAdd({ label, color: randomPaletteColor() });
    if (success) setDraft("");
  }

  const pendingItem = items.find((i) => i.id === pendingDeleteId) ?? null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <ul>
        {items.map((item, index) => (
          <OptionRow
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onEdit={onEdit}
            onMove={onMove}
            onRequestDelete={() => setPendingDeleteId(item.id)}
          />
        ))}
      </ul>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <PlusIcon className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
          placeholder={addPlaceholder}
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
        />
        {draft.trim() && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleAdd}
            className="shrink-0 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
          >
            Add
          </button>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this option?"
        description={pendingItem ? `"${pendingItem.label}" will be removed. This is blocked if any task still uses it.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await onRemove(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

interface OptionRowProps {
  item: OptionItem;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (id: string, patch: { label?: string; color?: string }) => void;
  onMove: (id: string, direction: 1 | -1) => void;
  onRequestDelete: () => void;
}

function OptionRow({ item, isFirst, isLast, onEdit, onMove, onRequestDelete }: OptionRowProps) {
  const [label, setLabel] = useState(item.label);

  function commit() {
    const trimmed = label.trim();
    if (trimmed && trimmed !== item.label) onEdit(item.id, { label: trimmed });
    else setLabel(item.label);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      (event.target as HTMLInputElement).blur();
    }
    if (event.key === "Escape") {
      setLabel(item.label);
      (event.target as HTMLInputElement).blur();
    }
  }

  return (
    <li className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-slate-800">
      <ColorSwatchPicker value={item.color} onChange={(color) => onEdit(item.id, { color })} />
      <input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-label={`Edit ${item.label}`}
        className="flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-slate-800 hover:border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:ring-indigo-950"
      />
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMove(item.id, -1)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          aria-label="Move up"
        >
          <SortIcon className="h-3.5 w-3.5 rotate-180" />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMove(item.id, 1)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
          aria-label="Move down"
        >
          <SortIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRequestDelete}
        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        aria-label={`Delete ${item.label}`}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}
