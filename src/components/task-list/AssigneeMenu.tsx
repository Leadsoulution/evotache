"use client";

import { Menu } from "@/components/ui/Menu";
import { Avatar } from "@/components/ui/Avatar";
import { UserPlusIcon } from "@/components/ui/icons";
import type { Assignee } from "@/types/task";

interface AssigneeMenuProps {
  assignees: Assignee[];
  value: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}

export function AssigneeMenu({ assignees, value, onChange, readOnly }: AssigneeMenuProps) {
  const options = assignees.map((assignee) => ({
    value: assignee.id,
    label: assignee.name,
    icon: <Avatar name={assignee.name} color={assignee.color} size="xs" />,
  }));
  const selected = assignees.filter((assignee) => value.includes(assignee.id));

  const avatarStack = (
    <span className="flex items-center -space-x-1.5 rounded-full px-1 py-0.5">
      {selected.slice(0, 3).map((assignee) => (
        <Avatar key={assignee.id} name={assignee.name} color={assignee.color} size="sm" />
      ))}
      {selected.length > 3 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-900">
          +{selected.length - 3}
        </span>
      )}
      {selected.length === 0 && <span className="text-xs text-slate-400">—</span>}
    </span>
  );

  if (readOnly) return avatarStack;

  return (
    <Menu
      options={options}
      value={value}
      multiple
      onChange={onChange}
      ariaLabel="Assign teammates"
      align="end"
      renderTrigger={() => (
        <span className="flex items-center -space-x-1.5 rounded-full px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800">
          {selected.slice(0, 3).map((assignee) => (
            <Avatar key={assignee.id} name={assignee.name} color={assignee.color} size="sm" />
          ))}
          {selected.length > 3 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-900">
              +{selected.length - 3}
            </span>
          )}
          {selected.length === 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-500 dark:border-slate-600">
              <UserPlusIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
      )}
    />
  );
}
