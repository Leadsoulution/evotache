"use client";

import type { ReactNode } from "react";
import { Menu } from "./Menu";
import { ChevronDownIcon } from "./icons";
import { cn } from "@/lib/cn";

interface FilterMenuProps {
  label: string;
  count: number;
  options: { value: string; label: string; dotColor?: string; icon?: ReactNode }[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function FilterMenu({ label, count, options, value, onChange }: FilterMenuProps) {
  return (
    <Menu
      options={options}
      value={value}
      multiple
      onChange={onChange}
      ariaLabel={`Filter by ${label}`}
      renderTrigger={() => (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
            count > 0
              ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
              : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
        >
          {label}
          {count > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white">{count}</span>}
          <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
        </span>
      )}
    />
  );
}

export function FilterTriggerButton({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
    >
      {label}
      <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
    </span>
  );
}
