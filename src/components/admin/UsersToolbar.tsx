"use client";

import { Menu } from "@/components/ui/Menu";
import { ROLE_CONFIG, ROLE_ORDER } from "@/config/roleMeta";
import { ChevronDownIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Role } from "@/types/user";

interface UsersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: Role[];
  onRoleFilterChange: (value: Role[]) => void;
  onInvite: () => void;
  visibleCount: number;
  totalCount: number;
}

export function UsersToolbar({ search, onSearchChange, roleFilter, onRoleFilterChange, onInvite, visibleCount, totalCount }: UsersToolbarProps) {
  const roleOptions = ROLE_ORDER.map((role) => ({ value: role, label: ROLE_CONFIG[role].label, dotColor: ROLE_CONFIG[role].dotColor }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search users..."
          aria-label="Search users"
          className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
        />
      </div>

      <Menu
        options={roleOptions}
        value={roleFilter}
        multiple
        onChange={(next) => onRoleFilterChange(next as Role[])}
        ariaLabel="Filter by role"
        renderTrigger={() => (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
              roleFilter.length > 0
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            Role
            {roleFilter.length > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white">{roleFilter.length}</span>}
            <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
          </span>
        )}
      />

      <span className="text-xs text-slate-400">
        {visibleCount} of {totalCount}
      </span>

      <button
        type="button"
        onClick={onInvite}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        <PlusIcon className="h-4 w-4" />
        Add user
      </button>
    </div>
  );
}
