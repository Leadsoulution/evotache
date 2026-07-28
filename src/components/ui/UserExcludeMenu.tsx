"use client";

import { Menu } from "./Menu";
import { UserPlusIcon } from "./icons";
import { cn } from "@/lib/cn";

interface UserExcludeMenuProps {
  users: { id: string; name: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}

/**
 * Lets an admin/manager explicitly hide a task, project, or team from a
 * specific person — an override that wins even if that person would
 * otherwise see it as someone's manager (see taskApi/projectApi/teamApi:
 * excludedUserIds is checked after, and instead of, the normal visibility
 * rule, for non-admins).
 */
export function UserExcludeMenu({ users, value, onChange, readOnly }: UserExcludeMenuProps) {
  const options = users.map((u) => ({ value: u.id, label: u.name }));
  const excluded = users.filter((u) => value.includes(u.id));

  const chips = (
    <span className="flex flex-wrap items-center gap-1">
      {excluded.map((u) => (
        <span key={u.id} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          {u.name}
        </span>
      ))}
      {excluded.length === 0 && <span className="text-xs text-slate-400">No one excluded</span>}
    </span>
  );

  if (readOnly) return chips;

  return (
    <Menu
      options={options}
      value={value}
      multiple
      onChange={onChange}
      ariaLabel="Exclude users"
      renderTrigger={({ open }) => (
        <span
          className={cn(
            "flex min-h-[26px] flex-wrap items-center gap-1 rounded-lg border border-slate-200 px-1.5 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
            open && "ring-2 ring-red-300"
          )}
        >
          {excluded.map((u) => (
            <span key={u.id} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
              {u.name}
            </span>
          ))}
          {excluded.length === 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <UserPlusIcon className="h-3.5 w-3.5" />
              Exclude a user
            </span>
          )}
        </span>
      )}
    />
  );
}
