"use client";

import { Menu } from "@/components/ui/Menu";
import { ROLE_CONFIG, ROLE_ORDER } from "@/config/roleMeta";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { Role } from "@/types/user";

const OPTIONS = ROLE_ORDER.map((role) => ({ value: role, label: ROLE_CONFIG[role].label, dotColor: ROLE_CONFIG[role].dotColor }));

interface RoleMenuProps {
  value: Role;
  onChange: (next: Role) => void;
  disabled?: boolean;
}

export function RoleMenu({ value, onChange, disabled }: RoleMenuProps) {
  const config = ROLE_CONFIG[value];
  const badge = (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium", config.bgColor, config.textColor)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </span>
  );

  if (disabled) return badge;

  return (
    <Menu
      options={OPTIONS}
      value={[value]}
      onChange={(next) => onChange(next[0] as Role)}
      ariaLabel="Change role"
      align="end"
      renderTrigger={({ open }) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            config.bgColor,
            config.textColor,
            open && "ring-2 ring-indigo-400"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
          {config.label}
          <ChevronDownIcon className="h-3 w-3 opacity-60" />
        </span>
      )}
    />
  );
}
