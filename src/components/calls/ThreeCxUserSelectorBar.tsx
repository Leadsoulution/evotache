"use client";

import { cn } from "@/lib/cn";
import type { InternalUser } from "@/lib/callStats";

interface ThreeCxUserSelectorBarProps {
  users: InternalUser[];
  selectedDn: string | null;
  onSelect: (dn: string | null) => void;
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Mirrors UserSelectorBar's (src/components/filters/UserSelectorBar.tsx)
 * exact visual pattern for the Statistics page — same avatar-row, single-
 * select "All"/one-entry behavior — but for 3CX extensions instead of app
 * users, which don't have a stored color/photo, so initials stand in for
 * the avatar. */
export function ThreeCxUserSelectorBar({ users, selectedDn, onSelect }: ThreeCxUserSelectorBarProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer par utilisateur 3CX">
      <button
        type="button"
        role="tab"
        aria-selected={selectedDn === null}
        onClick={() => onSelect(null)}
        className={cn(
          "flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
          selectedDn === null ? "bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950 dark:ring-indigo-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white dark:ring-slate-900",
            selectedDn === null ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
          )}
        >
          Tous
        </span>
        <span
          className={cn(
            "max-w-[72px] truncate text-xs font-medium",
            selectedDn === null ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"
          )}
        >
          Tout le monde
        </span>
      </button>

      {users.map((u) => {
        const selected = selectedDn === u.dn;
        return (
          <button
            key={u.dn}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(selected ? null : u.dn)}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
              selected ? "bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950 dark:ring-indigo-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white dark:ring-slate-900",
                selected ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
              )}
            >
              {initials(u.name)}
            </span>
            <span
              className={cn("max-w-[72px] truncate text-xs font-medium", selected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400")}
              title={`${u.name} (${u.dn})`}
            >
              {u.name.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
