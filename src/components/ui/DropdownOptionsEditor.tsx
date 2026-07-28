"use client";

import { ColorSwatchPicker } from "@/components/admin/ColorSwatchPicker";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { randomPaletteColor } from "@/config/colorPalette";
import { generateId } from "@/lib/id";

export interface DropdownOption {
  id: string;
  label: string;
  color: string;
}

interface DropdownOptionsEditorProps {
  options: DropdownOption[];
  onChange: (next: DropdownOption[]) => void;
}

/** Add/remove/recolor list for a dropdown-type column or custom field's options — shared by Achats columns and Task/Litige custom fields. */
export function DropdownOptionsEditor({ options, onChange }: DropdownOptionsEditorProps) {
  function addOption() {
    onChange([...options, { id: generateId("option"), label: "", color: randomPaletteColor() }]);
  }

  function editOption(id: string, patch: Partial<DropdownOption>) {
    onChange(options.map((option) => (option.id === id ? { ...option, ...patch } : option)));
  }

  function removeOption(id: string) {
    onChange(options.filter((option) => option.id !== id));
  }

  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-1.5">
            <ColorSwatchPicker value={option.color} onChange={(color) => editOption(option.id, { color })} />
            <input
              defaultValue={option.label}
              onBlur={(event) => editOption(option.id, { label: event.target.value.trim() })}
              onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
              aria-label={`Option ${index + 1}`}
              placeholder="Option label"
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
            />
            <button
              type="button"
              onClick={() => removeOption(option.id)}
              aria-label={`Remove option ${option.label || index + 1}`}
              className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="mt-1.5 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        <PlusIcon className="h-3 w-3" />
        Add option
      </button>
    </div>
  );
}
