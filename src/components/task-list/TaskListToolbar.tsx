"use client";

import { Menu } from "@/components/ui/Menu";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { Avatar } from "@/components/ui/Avatar";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";
import { ColumnsMenu } from "./ColumnsMenu";
import { ChevronDownIcon, KanbanIcon, ListIcon, RepeatIcon, SearchIcon, SortIcon, TrashIcon, UserIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Assignee, GroupField, SortDirection, SortField, TaskTypeFilter } from "@/types/task";
import type { MenuOption } from "@/components/ui/Menu";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { CustomFieldDef } from "@/types/customField";
import type { Project } from "@/types/project";
import type { Team } from "@/types/team";

export type TaskViewMode = "list" | "board";

const GROUP_OPTIONS: { value: GroupField; label: string }[] = [
  { value: "none", label: "No grouping" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
];

const TASK_TYPE_OPTIONS: MenuOption[] = [
  { value: "mission", label: "Mission" },
  { value: "recurring", label: "Recurring", icon: <RepeatIcon className="h-3.5 w-3.5" /> },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "manual", label: "Manual order" },
  { value: "title", label: "Title" },
  { value: "dueDate", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Date created" },
];

interface TaskListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (value: string[]) => void;
  priorityFilter: string[];
  onPriorityFilterChange: (value: string[]) => void;
  assigneeFilter: string[];
  onAssigneeFilterChange: (value: string[]) => void;
  projectFilter: string[];
  onProjectFilterChange: (value: string[]) => void;
  teamFilter: string[];
  onTeamFilterChange: (value: string[]) => void;
  taskTypeFilter: TaskTypeFilter[];
  onTaskTypeFilterChange: (value: TaskTypeFilter[]) => void;
  myTasksOnly: boolean;
  onMyTasksOnlyChange: (value: boolean) => void;
  assignees: Assignee[];
  projects: Project[];
  teams: Team[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  customFields: CustomFieldDef[];
  hiddenColumnIds: string[];
  onToggleColumn: (columnId: string) => void;
  groupField: GroupField;
  onGroupFieldChange: (value: GroupField) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (value: SortField) => void;
  onToggleSortDirection: () => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  visibleCount: number;
  totalCount: number;
  viewMode: TaskViewMode;
  onViewModeChange: (mode: TaskViewMode) => void;
}

export function TaskListToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  projectFilter,
  onProjectFilterChange,
  teamFilter,
  onTeamFilterChange,
  taskTypeFilter,
  onTaskTypeFilterChange,
  myTasksOnly,
  onMyTasksOnlyChange,
  assignees,
  projects,
  teams,
  statuses,
  priorities,
  customFields,
  hiddenColumnIds,
  onToggleColumn,
  groupField,
  onGroupFieldChange,
  sortField,
  sortDirection,
  onSortFieldChange,
  onToggleSortDirection,
  selectedCount,
  onBulkDelete,
  onClearSelection,
  visibleCount,
  totalCount,
  viewMode,
  onViewModeChange,
}: TaskListToolbarProps) {
  const statusOptions = statuses.map((status) => ({
    value: status.id,
    label: status.label,
    icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />,
  }));
  const priorityOptions = priorities.map((priority) => ({
    value: priority.id,
    label: priority.label,
    icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: priority.color }} />,
  }));
  const assigneeOptions = assignees.map((assignee) => ({
    value: assignee.id,
    label: assignee.name,
    icon: <Avatar name={assignee.name} color={assignee.color} photoDataUrl={assignee.photoDataUrl} size="xs" />,
  }));
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
    icon: <ProjectAvatar project={project} size="xs" />,
  }));
  const teamOptions = teams.map((team) => ({
    value: team.id,
    label: team.name,
    icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-56 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
          />
        </div>

        <FilterMenu label="Status" count={statusFilter.length} options={statusOptions} value={statusFilter} onChange={onStatusFilterChange} />
        <FilterMenu label="Priority" count={priorityFilter.length} options={priorityOptions} value={priorityFilter} onChange={onPriorityFilterChange} />
        <FilterMenu label="Assignee" count={assigneeFilter.length} options={assigneeOptions} value={assigneeFilter} onChange={onAssigneeFilterChange} />
        {projects.length > 0 && (
          <FilterMenu label="Project" count={projectFilter.length} options={projectOptions} value={projectFilter} onChange={onProjectFilterChange} />
        )}
        {teams.length > 0 && (
          <FilterMenu label="Department" count={teamFilter.length} options={teamOptions} value={teamFilter} onChange={onTeamFilterChange} />
        )}
        <FilterMenu label="Type" count={taskTypeFilter.length} options={TASK_TYPE_OPTIONS} value={taskTypeFilter} onChange={(next) => onTaskTypeFilterChange(next as TaskTypeFilter[])} />

        <button
          type="button"
          onClick={() => onMyTasksOnlyChange(!myTasksOnly)}
          aria-pressed={myTasksOnly}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
            myTasksOnly
              ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
              : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
        >
          <UserIcon className="h-3.5 w-3.5" />
          My Tasks
        </button>

        <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />

        {viewMode === "list" && (
          <>
            <Menu
              options={GROUP_OPTIONS}
              value={[groupField]}
              onChange={(next) => onGroupFieldChange(next[0] as GroupField)}
              ariaLabel="Group by"
              renderTrigger={() => <ToolbarButton label={`Group: ${GROUP_OPTIONS.find((o) => o.value === groupField)?.label}`} />}
            />

            <div className="flex items-center gap-1">
              <Menu
                options={SORT_OPTIONS}
                value={[sortField]}
                onChange={(next) => onSortFieldChange(next[0] as SortField)}
                ariaLabel="Sort by"
                renderTrigger={() => <ToolbarButton label={`Sort: ${SORT_OPTIONS.find((o) => o.value === sortField)?.label}`} />}
              />
              <button
                type="button"
                onClick={onToggleSortDirection}
                title={sortDirection === "asc" ? "Ascending" : "Descending"}
                aria-label="Toggle sort direction"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <SortIcon className={cn("h-4 w-4 transition-transform", sortDirection === "desc" && "rotate-180")} />
              </button>
            </div>

            <ColumnsMenu customFields={customFields} hiddenColumnIds={hiddenColumnIds} onToggle={onToggleColumn} />
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {visibleCount} of {totalCount}
          </span>
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              className={cn(
                "rounded-md p-1.5",
                viewMode === "list" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("board")}
              aria-label="Board view"
              aria-pressed={viewMode === "board"}
              className={cn(
                "rounded-md p-1.5",
                viewMode === "board" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <KanbanIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex animate-fade-in items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          <span className="font-medium">{selectedCount} selected</span>
          <button
            type="button"
            onClick={onBulkDelete}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950"
          >
            <TrashIcon className="h-3.5 w-3.5" /> Delete
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1 text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300"
          >
            <XIcon className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
      {label}
      <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
    </span>
  );
}
