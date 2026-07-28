"use client";

import { Menu } from "@/components/ui/Menu";
import { UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Team } from "@/types/team";

interface TeamMenuProps {
  teams: Team[];
  value: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}

function TeamChip({ team }: { team: Team }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${team.color}26`, color: team.color }}
    >
      {team.name}
    </span>
  );
}

export function TeamMenu({ teams, value, onChange, readOnly }: TeamMenuProps) {
  const options = teams.map((team) => ({
    value: team.id,
    label: team.name,
    icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />,
  }));
  const selected = teams.filter((team) => value.includes(team.id));

  const chips = (
    <span className="flex flex-wrap items-center gap-1">
      {selected.map((team) => (
        <TeamChip key={team.id} team={team} />
      ))}
      {selected.length === 0 && <span className="text-xs text-slate-400">No department</span>}
    </span>
  );

  if (readOnly) return chips;

  return (
    <Menu
      options={options}
      value={value}
      multiple
      onChange={onChange}
      ariaLabel="Assign departments"
      renderTrigger={({ open }) => (
        <span
          className={cn(
            "flex min-h-[26px] flex-wrap items-center gap-1 rounded-lg border border-slate-200 px-1.5 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
            open && "ring-2 ring-indigo-400"
          )}
        >
          {selected.map((team) => (
            <TeamChip key={team.id} team={team} />
          ))}
          {selected.length === 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <UsersIcon className="h-3.5 w-3.5" />
              Assign department
            </span>
          )}
        </span>
      )}
    />
  );
}
