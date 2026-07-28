"use client";

import { Menu } from "@/components/ui/Menu";
import { Avatar } from "@/components/ui/Avatar";
import { UserPlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { AppUser } from "@/types/user";

interface ContentAssigneeMenuProps {
  users: AppUser[];
  value: string | null;
  onChange: (next: string | null) => void;
  readOnly?: boolean;
}

/** Single-assignee picker (unlike task's multi-assignee AssigneeMenu) for Reels/Posts/Stories. */
export function ContentAssigneeMenu({ users, value, onChange, readOnly }: ContentAssigneeMenuProps) {
  const current = users.find((u) => u.id === value) ?? null;
  const options = users.map((u) => ({ value: u.id, label: u.name }));

  const badge = current ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <Avatar name={current.name} color={current.color} photoDataUrl={current.photoDataUrl} size="xs" />
      {current.name}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <UserPlusIcon className="h-3.5 w-3.5" />
      Unassigned
    </span>
  );

  if (readOnly) return badge;

  return (
    <Menu
      options={options}
      value={value ? [value] : []}
      onChange={(next) => onChange(next[0] ?? null)}
      ariaLabel="Assign to"
      renderTrigger={({ open }) => (
        <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs", open && "ring-2 ring-indigo-400")}>{badge}</span>
      )}
    />
  );
}
