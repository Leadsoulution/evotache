"use client";

import { useMemo } from "react";
import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/ui/icons";
import { wouldCreateManagerCycle } from "@/lib/orgChart";
import type { AppUser } from "@/types/user";

interface ManagerMenuProps {
  targetUser: AppUser;
  users: AppUser[];
  onChange: (managerIds: string[]) => void;
  disabled?: boolean;
}

export function ManagerMenu({ targetUser, users, onChange, disabled }: ManagerMenuProps) {
  const managerIds = useMemo(() => targetUser.managerIds ?? [], [targetUser.managerIds]);

  const options = useMemo(() => {
    return users
      .filter((candidate) => candidate.id !== targetUser.id)
      .filter((candidate) => managerIds.includes(candidate.id) || !wouldCreateManagerCycle(users, targetUser.id, candidate.id))
      .map((candidate) => ({ value: candidate.id, label: candidate.name }));
  }, [users, targetUser.id, managerIds]);

  const managers = users.filter((candidate) => managerIds.includes(candidate.id));
  const label = managers.length > 0 ? managers.map((m) => m.name).join(", ") : "No manager";

  if (disabled) {
    return <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>;
  }

  return (
    <Menu
      options={options}
      value={managerIds}
      multiple
      onChange={onChange}
      ariaLabel={`Change managers for ${targetUser.name}`}
      align="end"
      renderTrigger={({ open }) => (
        <span
          className={cn(
            "inline-flex max-w-[180px] items-center gap-1 truncate rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            open && "ring-2 ring-indigo-400"
          )}
          title={label}
        >
          <span className="truncate">{label}</span>
          <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-60" />
        </span>
      )}
    />
  );
}
