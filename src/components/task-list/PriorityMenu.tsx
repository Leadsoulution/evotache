"use client";

import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { getBadgeStyle } from "@/lib/badgeColor";
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
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold" style={getBadgeStyle(current?.color)}>
      <FlagIcon className="h-3.5 w-3.5" />
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
          className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-shadow", open && "ring-2 ring-indigo-400")}
          style={getBadgeStyle(current?.color)}
        >
          <FlagIcon className="h-3.5 w-3.5" />
          {current?.label ?? "—"}
          <ChevronDownIcon className="h-3 w-3 opacity-60" />
        </span>
      )}
    />
  );
}
