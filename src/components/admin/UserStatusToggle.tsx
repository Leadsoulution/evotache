"use client";

import { cn } from "@/lib/cn";
import type { UserStatus } from "@/types/user";

interface UserStatusToggleProps {
  status: UserStatus;
  onChange: (next: UserStatus) => void;
  disabled?: boolean;
}

export function UserStatusToggle({ status, onChange, disabled }: UserStatusToggleProps) {
  const active = status === "active";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(active ? "disabled" : "active")}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70",
        active
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
      {active ? "Active" : "Disabled"}
    </button>
  );
}
