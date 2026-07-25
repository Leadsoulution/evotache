"use client";

import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Menu } from "@/components/ui/Menu";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { CustomFieldDef } from "@/types/customField";

interface CustomFieldCellProps {
  field: CustomFieldDef;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
}

export function CustomFieldCell({ field, value, onChange, readOnly }: CustomFieldCellProps) {
  if (field.type === "select") {
    const options = field.options.map((option) => ({ value: option, label: option }));
    if (readOnly || options.length === 0) {
      return <span className="block truncate px-2 py-1 text-sm text-slate-600 dark:text-slate-300">{value || "—"}</span>;
    }
    return (
      <Menu
        options={options}
        value={value ? [value] : []}
        onChange={(next) => onChange(next[0] ?? "")}
        ariaLabel={`Set ${field.name}`}
        align="end"
        renderTrigger={({ open }) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              open && "ring-2 ring-indigo-400"
            )}
          >
            {value || <span className="text-slate-400">Select…</span>}
            <ChevronDownIcon className="h-3 w-3 opacity-60" />
          </span>
        )}
      />
    );
  }

  return <TextLikeCell field={field} value={value} onChange={onChange} readOnly={readOnly} />;
}

function TextLikeCell({ field, value, onChange, readOnly }: CustomFieldCellProps) {
  const [draft, setDraft] = useState(value);

  if (readOnly) {
    return <span className="block truncate px-2 py-1 text-sm text-slate-600 dark:text-slate-300">{value || "—"}</span>;
  }

  function commit() {
    if (draft !== value) onChange(draft);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") (event.target as HTMLInputElement).blur();
    if (event.key === "Escape") {
      setDraft(value);
      (event.target as HTMLInputElement).blur();
    }
  }

  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      aria-label={field.name}
      placeholder="—"
      className="w-full rounded-md px-2 py-1 text-sm text-slate-700 outline-none hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-200 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-900 dark:focus:ring-indigo-900"
    />
  );
}
