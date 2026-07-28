"use client";

import { FilterMenu } from "@/components/ui/FilterMenu";
import { DateRangeFilter } from "./DateRangeFilter";
import { Avatar } from "@/components/ui/Avatar";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";
import { XIcon } from "@/components/ui/icons";
import type { GlobalFilters } from "@/lib/globalFilters";
import { countActiveGlobalFilters, hasActiveGlobalFilters } from "@/lib/globalFilters";
import type { AppUser } from "@/types/user";
import type { Team } from "@/types/team";
import type { Project } from "@/types/project";
import type { StatusDef, PriorityDef } from "@/types/taskMeta";

interface GlobalFilterBarProps {
  filters: GlobalFilters;
  onTeamIdsChange: (value: string[]) => void;
  onUserIdsChange: (value: string[]) => void;
  onProjectIdsChange: (value: string[]) => void;
  onPrioritiesChange: (value: string[]) => void;
  onStatusesChange: (value: string[]) => void;
  onDateRangeChange: (from: string | null, to: string | null) => void;
  onClearAll: () => void;
  teams: Team[];
  users: AppUser[];
  projects: Project[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
}

export function GlobalFilterBar({
  filters,
  onTeamIdsChange,
  onUserIdsChange,
  onProjectIdsChange,
  onPrioritiesChange,
  onStatusesChange,
  onDateRangeChange,
  onClearAll,
  teams,
  users,
  projects,
  statuses,
  priorities,
}: GlobalFilterBarProps) {
  const userOptions = users
    .filter((u) => u.status === "active")
    .map((u) => ({ value: u.id, label: u.name, icon: <Avatar name={u.name} color={u.color} photoDataUrl={u.photoDataUrl} size="xs" /> }));
  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name, icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: team.color }} /> }));
  const projectOptions = projects.map((project) => ({ value: project.id, label: project.name, icon: <ProjectAvatar project={project} size="xs" /> }));
  const priorityOptions = priorities.map((p) => ({ value: p.id, label: p.label, icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} /> }));
  const statusOptions = statuses.map((s) => ({ value: s.id, label: s.label, icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} /> }));

  const activeCount = countActiveGlobalFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {teams.length > 0 && <FilterMenu label="Department" count={filters.teamIds.length} options={teamOptions} value={filters.teamIds} onChange={onTeamIdsChange} />}
      <FilterMenu label="User" count={filters.userIds.length} options={userOptions} value={filters.userIds} onChange={onUserIdsChange} />
      {projects.length > 0 && (
        <FilterMenu label="Project" count={filters.projectIds.length} options={projectOptions} value={filters.projectIds} onChange={onProjectIdsChange} />
      )}
      <FilterMenu label="Priority" count={filters.priorities.length} options={priorityOptions} value={filters.priorities} onChange={onPrioritiesChange} />
      <FilterMenu label="Status" count={filters.statuses.length} options={statusOptions} value={filters.statuses} onChange={onStatusesChange} />
      <DateRangeFilter from={filters.dateFrom} to={filters.dateTo} onChange={onDateRangeChange} />

      {hasActiveGlobalFilters(filters) && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <XIcon className="h-3.5 w-3.5" />
          Clear filters ({activeCount})
        </button>
      )}
    </div>
  );
}
