"use client";

import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { getBadgeStyle } from "@/lib/badgeColor";
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
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold" style={getBadgeStyle(current?.color)}>
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
          className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-shadow", open && "ring-2 ring-indigo-400")}
          style={getBadgeStyle(current?.color)}
        >
          {current?.label ?? "—"}
          <ChevronDownIcon className="h-3 w-3 opacity-60" />
        </span>
      )}
    />
  );
}
