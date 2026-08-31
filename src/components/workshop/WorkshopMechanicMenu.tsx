"use client";

import { Menu } from "@/components/ui/Menu";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronDownIcon, UserPlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Assignee } from "@/types/task";

interface WorkshopMechanicMenuProps {
  mechanics: Assignee[];
  value: string | null;
  onChange: (mechanicId: string | null) => void;
  readOnly?: boolean;
}

/** Single-select "pick a mechanic" — same underlying Menu as StatusMenu,
 * reusing the app's existing user roster (fetchAssignees) rather than a
 * separate mechanic list/role: any active user can be assigned. */
export function WorkshopMechanicMenu({ mechanics, value, onChange, readOnly }: WorkshopMechanicMenuProps) {
  const current = mechanics.find((m) => m.id === value) ?? null;
  const options = mechanics.map((m) => ({
    value: m.id,
    label: m.name,
    icon: <Avatar name={m.name} color={m.color} photoDataUrl={m.photoDataUrl} size="xs" />,
  }));

  const display = current ? (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={current.name} color={current.color} photoDataUrl={current.photoDataUrl} size="xs" />
      {current.name}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-slate-400">
      <UserPlusIcon className="h-3.5 w-3.5" />
      Non affecté
    </span>
  );

  if (readOnly) return <span className="inline-flex items-center gap-1.5 text-sm">{display}</span>;

  return (
    <Menu
      options={options}
      value={value ? [value] : []}
      onChange={(next) => onChange(next[0] ?? null)}
      ariaLabel="Sélectionner un mécanicien"
      align="end"
      renderTrigger={({ open }) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
            open && "ring-2 ring-indigo-400"
          )}
        >
          {display}
          <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
        </span>
      )}
    />
  );
}
