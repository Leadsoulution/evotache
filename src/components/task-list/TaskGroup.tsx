"use client";

import { useState } from "react";
import { TaskRow } from "./TaskRow";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { getGroupColor } from "@/lib/taskGroupColor";
import type { FlatTreeRow } from "@/lib/taskTree";
import type { Assignee, GroupField, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { CustomFieldDef } from "@/types/customField";
import type { TaskPermissions } from "@/lib/taskPermissions";
import type { Team } from "@/types/team";

interface TaskGroupProps {
  groupKey: string;
  groupField: GroupField;
  label: string;
  rows: FlatTreeRow[];
  assignees: Assignee[];
  teams: Team[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  columnOrder: string[];
  columnCount: number;
  visibleCustomFields: CustomFieldDef[];
  attachmentCounts: Record<string, number>;
  selectedIds: Set<string>;
  collapsedIds: Set<string>;
  dragEnabled: boolean;
  permissions: TaskPermissions;
  showGroupHeader: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleCollapse: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRequestDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onOpenDetail: (task: Task) => void;
  registerCheckboxRef: (id: string, el: HTMLInputElement | null) => void;
  onCheckboxKeyNav: (id: string, direction: 1 | -1) => void;
  onDragStart: (id: string) => void;
  onDropOn: (id: string, edge: "before" | "after") => void;
}

export function TaskGroup({
  groupKey,
  groupField,
  label,
  rows,
  assignees,
  teams,
  statuses,
  priorities,
  columnOrder,
  columnCount,
  visibleCustomFields,
  attachmentCounts,
  selectedIds,
  collapsedIds,
  dragEnabled,
  permissions,
  showGroupHeader,
  onToggleSelect,
  onToggleCollapse,
  onUpdate,
  onRequestDelete,
  onAddSubtask,
  onOpenDetail,
  registerCheckboxRef,
  onCheckboxKeyNav,
  onDragStart,
  onDropOn,
}: TaskGroupProps) {
  const [sectionCollapsed, setSectionCollapsed] = useState(false);
  const color = getGroupColor(groupKey, groupField, statuses, priorities);

  return (
    <tbody>
      {showGroupHeader && (
        <tr>
          <td
            colSpan={columnCount}
            className={cn("px-3 py-1.5", !color && "bg-slate-50 dark:bg-slate-900/60")}
            style={color ? { backgroundColor: `${color}D9` } : undefined}
          >
            <button
              type="button"
              onClick={() => setSectionCollapsed((c) => !c)}
              className={cn(
                "flex items-center gap-1.5 rounded text-xs font-semibold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                color ? "text-white hover:text-white/80" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
              aria-expanded={!sectionCollapsed}
            >
              <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", sectionCollapsed && "-rotate-90")} />
              {label}
              <span className={cn("font-normal normal-case", color ? "text-white/80" : "text-slate-400")}>{rows.length}</span>
            </button>
          </td>
        </tr>
      )}
      {!sectionCollapsed &&
        rows.map(({ task, depth, hasChildren, childCount }) => (
          <TaskRow
            key={task.id}
            task={task}
            depth={depth}
            hasChildren={hasChildren}
            childCount={childCount}
            collapsed={collapsedIds.has(task.id)}
            onToggleCollapse={onToggleCollapse}
            assignees={assignees}
            teams={teams}
            statuses={statuses}
            priorities={priorities}
            columnOrder={columnOrder}
            visibleCustomFields={visibleCustomFields}
            attachmentCount={attachmentCounts[task.id] ?? 0}
            selected={selectedIds.has(task.id)}
            dragEnabled={dragEnabled}
            permissions={permissions}
            onToggleSelect={onToggleSelect}
            onUpdate={onUpdate}
            onRequestDelete={onRequestDelete}
            onAddSubtask={onAddSubtask}
            onOpenDetail={onOpenDetail}
            registerCheckboxRef={registerCheckboxRef}
            onCheckboxKeyNav={onCheckboxKeyNav}
            onDragStart={onDragStart}
            onDropOn={onDropOn}
          />
        ))}
    </tbody>
  );
}
