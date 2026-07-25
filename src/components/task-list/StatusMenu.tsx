"use client";

import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { StatusDef } from "@/types/taskMeta";

interface StatusMenuProps {
  value: string;
  statuses: StatusDef[];
  onChange: (next: string) => void;
  readOnly?: boolean;
}

export function StatusMenu({ value, statuses, onChange, readOnly }: StatusMenuProps) {
  const current = statuses.find((s) => s.id === value);
  const options = statuses.map((s) => ({
    value: s.id,
    label: s.label,
    icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />,
  }));

  const badge = (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: current?.color ?? "#94a3b8" }} />
      {current?.label ?? "—"}
    </span>
  );

  if (readOnly) return badge;

  return (
    <Menu
      options={options}
      value={[value]}
      onChange={(next) => onChange(next[0])}
      ariaLabel="Change status"
      align="end"
      renderTrigger={({ open }) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 transition-colors dark:bg-slate-800 dark:text-slate-200",
            open && "ring-2 ring-indigo-400"
          )}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: current?.color ?? "#94a3b8" }} />
          {current?.label ?? "—"}
          <ChevronDownIcon className="h-3 w-3 opacity-60" />
        </span>
      )}
    />
  );
}
