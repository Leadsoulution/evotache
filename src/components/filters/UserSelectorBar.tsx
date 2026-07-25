"use client";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import type { AppUser } from "@/types/user";

interface UserSelectorBarProps {
  users: AppUser[];
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
}

export function UserSelectorBar({ users, selectedUserId, onSelectUser }: UserSelectorBarProps) {
  const activeUsers = users.filter((u) => u.status === "active");

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by employee">
      <button
        type="button"
        role="tab"
        aria-selected={selectedUserId === null}
        onClick={() => onSelectUser(null)}
        className={cn(
          "flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
          selectedUserId === null
            ? "bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950 dark:ring-indigo-800"
            : "hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white dark:ring-slate-900",
            selectedUserId === null ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
          )}
        >
          All
        </span>
        <span
          className={cn(
            "max-w-[72px] truncate text-xs font-medium",
            selectedUserId === null ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"
          )}
        >
          Everyone
        </span>
      </button>

      {activeUsers.map((user) => {
        const selected = selectedUserId === user.id;
        return (
          <button
            key={user.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelectUser(selected ? null : user.id)}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
              selected ? "bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950 dark:ring-indigo-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Avatar name={user.name} color={user.color} size="md" className={cn(selected && "ring-2 ring-indigo-500")} />
            <span
              className={cn("max-w-[72px] truncate text-xs font-medium", selected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400")}
              title={user.name}
            >
              {user.name.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
