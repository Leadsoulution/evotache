"use client";

import { StatusMenu } from "./StatusMenu";
import { PriorityMenu } from "./PriorityMenu";
import { AssigneeMenu } from "./AssigneeMenu";
import { TeamMenu } from "./TeamMenu";
import { DueDateMenu } from "./DueDateMenu";
import type { VisibleColumns } from "./TaskRow";
import { ChevronDownIcon, EyeIcon, PaperclipIcon, PlusIcon, RepeatIcon, TrashIcon } from "@/components/ui/icons";
import { describeRecurrence } from "@/lib/recurrence";
import { cn } from "@/lib/cn";
import type { Assignee, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { TaskPermissions } from "@/lib/taskPermissions";
import type { Team } from "@/types/team";

interface TaskCardProps {
  task: Task;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  assignees: Assignee[];
  teams: Team[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  visibleColumns: VisibleColumns;
  attachmentCount: number;
  selected: boolean;
  permissions: TaskPermissions;
  onToggleSelect: (id: string, checked: boolean) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRequestDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onOpenDetail: (task: Task) => void;
}

export function TaskCard({
  task,
  depth,
  hasChildren,
  collapsed,
  onToggleCollapse,
  assignees,
  teams,
  statuses,
  priorities,
  visibleColumns,
  attachmentCount,
  selected,
  permissions,
  onToggleSelect,
  onUpdate,
  onRequestDelete,
  onAddSubtask,
  onOpenDetail,
}: TaskCardProps) {
  // Status, not priority — every task always has one (priority is often
  // "none", which would leave the bar an invisible pale gray), and it then
  // reads consistently with the group header color when grouped by status.
  const statusColor = statuses.find((s) => s.id === task.status)?.color ?? "#cbd5e1";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-l-4 border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        selected && "bg-indigo-50/60 dark:bg-indigo-950/30"
      )}
      style={{ marginLeft: depth * 14, borderLeftColor: statusColor }}
    >
      <div className="flex items-start gap-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(task.id)}
            className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={collapsed ? "Expand subtasks" : "Collapse subtasks"}
          >
            <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", collapsed && "-rotate-90")} />
          </button>
        ) : (
          <span className="mt-0.5 w-4 shrink-0" aria-hidden="true" />
        )}
        <input
          type="checkbox"
          checked={selected}
          disabled={!permissions.canDelete}
          onChange={(event) => onToggleSelect(task.id, event.target.checked)}
          aria-label={`Select task ${task.title}`}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          type="button"
          onClick={() => onOpenDetail(task)}
          className={cn(
            "min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800 dark:text-slate-100",
            task.status === "done" && "text-slate-400 line-through dark:text-slate-500"
          )}
        >
          {task.title}
        </button>
        {task.recurrence && (
          <span className="shrink-0 text-indigo-400 dark:text-indigo-300" title={describeRecurrence(task.recurrence)}>
            <RepeatIcon className="h-3.5 w-3.5" />
          </span>
        )}
        {attachmentCount > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-slate-400">
            <PaperclipIcon className="h-3.5 w-3.5" />
            <span className="text-xs">{attachmentCount}</span>
          </span>
        )}
        <button type="button" onClick={() => onOpenDetail(task)} className="shrink-0 rounded-md p-1 text-slate-400" aria-label={`Open details for ${task.title}`}>
          <EyeIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        {visibleColumns.status && (
          <StatusMenu value={task.status} statuses={statuses} onChange={(status) => onUpdate(task.id, { status })} readOnly={!permissions.canEditStatus} />
        )}
        {visibleColumns.priority && (
          <PriorityMenu
            value={task.priority}
            priorities={priorities}
            onChange={(priority) => onUpdate(task.id, { priority })}
            readOnly={!permissions.canEditFull}
          />
        )}
        {visibleColumns.dueDate && (
          <DueDateMenu dueDate={task.dueDate} onChangeDue={(dueDate) => onUpdate(task.id, { dueDate })} readOnly={!permissions.canEditFull} />
        )}
        {visibleColumns.assignees && (
          <AssigneeMenu
            assignees={assignees}
            value={task.assigneeIds}
            onChange={(assigneeIds) => onUpdate(task.id, { assigneeIds })}
            readOnly={!permissions.canEditFull}
          />
        )}
        {visibleColumns.team && (
          <TeamMenu teams={teams} value={task.teamIds ?? []} onChange={(teamIds) => onUpdate(task.id, { teamIds })} readOnly={!permissions.canEditFull} />
        )}
        {(permissions.canCreate || permissions.canDelete) && (
          <div className="ml-auto flex items-center gap-1">
            {permissions.canCreate && (
              <button
                type="button"
                onClick={() => onAddSubtask(task.id)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={`Add subtask under ${task.title}`}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
            {permissions.canDelete && (
              <button
                type="button"
                onClick={() => onRequestDelete(task.id)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                aria-label={`Delete task ${task.title}`}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
