"use client";

import { Avatar } from "@/components/ui/Avatar";
import { PencilIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { InternalUser } from "@/lib/callStats";

interface ThreeCxUserSelectorBarProps {
  users: InternalUser[];
  selectedDn: string | null;
  onSelect: (dn: string | null) => void;
  onManage: () => void;
}

/** Mirrors UserSelectorBar's (src/components/filters/UserSelectorBar.tsx)
 * exact visual pattern for the Statistics page — same avatar-row, single-
 * select "All"/one-entry behavior, and the same Avatar component (using
 * each user's own color) — but for 3CX extensions instead of app users.
 * The "Gérer" button opens ThreeCxUserManager and stays reachable even
 * when every detected user is currently hidden, so hiding everyone can't
 * lock the admin out of restoring them. */
export function ThreeCxUserSelectorBar({ users, selectedDn, onSelect, onManage }: ThreeCxUserSelectorBarProps) {
  const visibleUsers = users.filter((u) => !u.hidden);
  if (users.length === 0) return null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer par utilisateur 3CX">
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

        {visibleUsers.length === 0 && <span className="px-1 text-xs text-slate-400">Tous les utilisateurs sont masqués.</span>}

        {visibleUsers.map((u) => {
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
              <Avatar name={u.name} color={u.color} size="md" className={cn(selected && "ring-2 ring-indigo-500")} />
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
      <button
        type="button"
        onClick={onManage}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <PencilIcon className="h-3.5 w-3.5" />
        Gérer
      </button>
    </div>
  );
}
