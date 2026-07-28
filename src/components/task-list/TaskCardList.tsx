"use client";

import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { NewTaskRow } from "./NewTaskRow";
import type { VisibleColumns } from "./TaskRow";
import type { TaskTableGroup } from "./TaskTable";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Assignee, GroupField, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { TaskPermissions } from "@/lib/taskPermissions";
import type { Team } from "@/types/team";

interface TaskCardListProps {
  groups: TaskTableGroup[];
  assignees: Assignee[];
  teams: Team[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  visibleColumns: VisibleColumns;
  attachmentCounts: Record<string, number>;
  groupField: GroupField;
  permissions: TaskPermissions;
  selectedIds: Set<string>;
  collapsedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleCollapse: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRequestDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onOpenDetail: (task: Task) => void;
  onCreate: (title: string) => void;
}

export function TaskCardList({
  groups,
  assignees,
  teams,
  statuses,
  priorities,
  visibleColumns,
  attachmentCounts,
  groupField,
  permissions,
  selectedIds,
  collapsedIds,
  onToggleSelect,
  onToggleCollapse,
  onUpdate,
  onRequestDelete,
  onAddSubtask,
  onOpenDetail,
  onCreate,
}: TaskCardListProps) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {groups.map((group) => (
        <TaskCardGroup
          key={group.key}
          group={group}
          showHeader={groupField !== "none"}
          assignees={assignees}
          teams={teams}
          statuses={statuses}
          priorities={priorities}
          visibleColumns={visibleColumns}
          attachmentCounts={attachmentCounts}
          permissions={permissions}
          selectedIds={selectedIds}
          collapsedIds={collapsedIds}
          onToggleSelect={onToggleSelect}
          onToggleCollapse={onToggleCollapse}
          onUpdate={onUpdate}
          onRequestDelete={onRequestDelete}
          onAddSubtask={onAddSubtask}
          onOpenDetail={onOpenDetail}
        />
      ))}
      {permissions.canCreate && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <NewTaskRow onCreate={onCreate} />
        </div>
      )}
    </div>
  );
}

interface TaskCardGroupProps {
  group: TaskTableGroup;
  showHeader: boolean;
  assignees: Assignee[];
  teams: Team[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  visibleColumns: VisibleColumns;
  attachmentCounts: Record<string, number>;
  permissions: TaskPermissions;
  selectedIds: Set<string>;
  collapsedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleCollapse: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRequestDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onOpenDetail: (task: Task) => void;
}

function TaskCardGroup({
  group,
  showHeader,
  assignees,
  teams,
  statuses,
  priorities,
  visibleColumns,
  attachmentCounts,
  permissions,
  selectedIds,
  collapsedIds,
  onToggleSelect,
  onToggleCollapse,
  onUpdate,
  onRequestDelete,
  onAddSubtask,
  onOpenDetail,
}: TaskCardGroupProps) {
  const [sectionCollapsed, setSectionCollapsed] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {showHeader && (
        <button
          type="button"
          onClick={() => setSectionCollapsed((c) => !c)}
          className="flex w-full items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
        >
          <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", sectionCollapsed && "-rotate-90")} />
          {group.label}
          <span className="font-normal normal-case text-slate-400">{group.rows.length}</span>
        </button>
      )}
      {!sectionCollapsed &&
        group.rows.map(({ task, depth, hasChildren }) => (
          <TaskCard
            key={task.id}
            task={task}
            depth={depth}
            hasChildren={hasChildren}
            collapsed={collapsedIds.has(task.id)}
            onToggleCollapse={onToggleCollapse}
            assignees={assignees}
            teams={teams}
            statuses={statuses}
            priorities={priorities}
            visibleColumns={visibleColumns}
            attachmentCount={attachmentCounts[task.id] ?? 0}
            selected={selectedIds.has(task.id)}
            permissions={permissions}
            onToggleSelect={onToggleSelect}
            onUpdate={onUpdate}
            onRequestDelete={onRequestDelete}
            onAddSubtask={onAddSubtask}
            onOpenDetail={onOpenDetail}
          />
        ))}
    </div>
  );
}
