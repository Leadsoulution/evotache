"use client";

import { useState } from "react";
import { TaskRow } from "./TaskRow";
import type { VisibleColumns } from "./TaskRow";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { FlatTreeRow } from "@/lib/taskTree";
import type { Assignee, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { CustomFieldDef } from "@/types/customField";
import type { TaskPermissions } from "@/lib/taskPermissions";

interface TaskGroupProps {
  label: string;
  rows: FlatTreeRow[];
  assignees: Assignee[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  visibleColumns: VisibleColumns;
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
  label,
  rows,
  assignees,
  statuses,
  priorities,
  visibleColumns,
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
  const columnCount = 3 + Object.values(visibleColumns).filter(Boolean).length + visibleCustomFields.length;

  return (
    <tbody>
      {showGroupHeader && (
        <tr>
          <td colSpan={columnCount} className="bg-slate-50 px-3 py-1.5 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={() => setSectionCollapsed((c) => !c)}
              className="flex items-center gap-1.5 rounded text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-200"
              aria-expanded={!sectionCollapsed}
            >
              <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", sectionCollapsed && "-rotate-90")} />
              {label}
              <span className="font-normal normal-case text-slate-400">{rows.length}</span>
            </button>
          </td>
        </tr>
      )}
      {!sectionCollapsed &&
        rows.map(({ task, depth, hasChildren }) => (
          <TaskRow
            key={task.id}
            task={task}
            depth={depth}
            hasChildren={hasChildren}
            collapsed={collapsedIds.has(task.id)}
            onToggleCollapse={onToggleCollapse}
            assignees={assignees}
            statuses={statuses}
            priorities={priorities}
            visibleColumns={visibleColumns}
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
