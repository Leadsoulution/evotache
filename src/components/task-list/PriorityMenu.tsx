"use client";

import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { ChevronDownIcon, FlagIcon } from "@/components/ui/icons";
import type { PriorityDef } from "@/types/taskMeta";

interface PriorityMenuProps {
  value: string;
  priorities: PriorityDef[];
  onChange: (next: string) => void;
  readOnly?: boolean;
}

export function PriorityMenu({ value, priorities, onChange, readOnly }: PriorityMenuProps) {
  const current = priorities.find((p) => p.id === value);
  const options = priorities.map((p) => ({
    value: p.id,
    label: p.label,
    icon: (
      <span style={{ color: p.color }}>
        <FlagIcon className="h-3.5 w-3.5 shrink-0" />
      </span>
    ),
  }));

  const badge = (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span style={{ color: current?.color ?? "#94a3b8" }}>
        <FlagIcon className="h-3.5 w-3.5" />
      </span>
      {current?.label ?? "—"}
    </span>
  );

  if (readOnly) return badge;

  return (
    <Menu
      options={options}
      value={[value]}
      onChange={(next) => onChange(next[0])}
      ariaLabel="Change priority"
      align="end"
      renderTrigger={({ open }) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            open && "ring-2 ring-indigo-400"
          )}
        >
          <span style={{ color: current?.color ?? "#94a3b8" }}>
            <FlagIcon className="h-3.5 w-3.5" />
          </span>
          {current?.label ?? "—"}
          <ChevronDownIcon className="h-3 w-3 opacity-60" />
        </span>
      )}
    />
  );
}
