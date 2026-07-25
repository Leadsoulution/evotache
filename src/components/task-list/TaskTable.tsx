"use client";

import { useMemo, useRef } from "react";
import { TaskGroup } from "./TaskGroup";
import { NewTaskRow } from "./NewTaskRow";
import type { VisibleColumns } from "./TaskRow";
import { computeOrderBetween } from "@/lib/taskQuery";
import type { Assignee, GroupField, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { CustomFieldDef } from "@/types/customField";
import type { FlatTreeRow } from "@/lib/taskTree";
import type { TaskPermissions } from "@/lib/taskPermissions";

export interface TaskTableGroup {
  key: string;
  label: string;
  rows: FlatTreeRow[];
}

interface TaskTableProps {
  groups: TaskTableGroup[];
  allTasksById: Map<string, Task>;
  assignees: Assignee[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  visibleColumns: VisibleColumns;
  visibleCustomFields: CustomFieldDef[];
  attachmentCounts: Record<string, number>;
  groupField: GroupField;
  dragEnabled: boolean;
  permissions: TaskPermissions;
  selectedIds: Set<string>;
  collapsedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleCollapse: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRequestDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onOpenDetail: (task: Task) => void;
  onReorder: (id: string, order: number) => void;
  onCreate: (title: string) => void;
}

export function TaskTable({
  groups,
  allTasksById,
  assignees,
  statuses,
  priorities,
  visibleColumns,
  visibleCustomFields,
  attachmentCounts,
  groupField,
  dragEnabled,
  permissions,
  selectedIds,
  collapsedIds,
  onToggleSelect,
  onToggleSelectAll,
  onToggleCollapse,
  onUpdate,
  onRequestDelete,
  onAddSubtask,
  onOpenDetail,
  onReorder,
  onCreate,
}: TaskTableProps) {
  const checkboxRefs = useRef(new Map<string, HTMLInputElement>());
  const draggedId = useRef<string | null>(null);

  const allRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const flatOrder = useMemo(() => allRows.map((r) => r.task.id), [allRows]);
  const columnCount = 3 + Object.values(visibleColumns).filter(Boolean).length + visibleCustomFields.length;

  function registerCheckboxRef(id: string, el: HTMLInputElement | null) {
    if (el) checkboxRefs.current.set(id, el);
    else checkboxRefs.current.delete(id);
  }

  function onCheckboxKeyNav(id: string, direction: 1 | -1) {
    const index = flatOrder.indexOf(id);
    const nextId = flatOrder[index + direction];
    if (nextId) checkboxRefs.current.get(nextId)?.focus();
  }

  function onDragStart(id: string) {
    draggedId.current = id;
  }

  function onDropOn(targetId: string, edge: "before" | "after") {
    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const sourceTask = allTasksById.get(sourceId);
    const targetTask = allTasksById.get(targetId);
    if (!sourceTask || !targetTask || sourceTask.parentId !== targetTask.parentId) return;
    const siblingRows = allRows.filter((r) => r.task.parentId === targetTask.parentId);
    const index = siblingRows.findIndex((r) => r.task.id === targetId);
    if (index === -1) return;
    const rawBefore = edge === "before" ? siblingRows[index - 1]?.task : siblingRows[index].task;
    const rawAfter = edge === "before" ? siblingRows[index].task : siblingRows[index + 1]?.task;
    const before = rawBefore?.id === sourceId ? undefined : rawBefore;
    const after = rawAfter?.id === sourceId ? undefined : rawAfter;
    const nextOrder = computeOrderBetween(before?.order, after?.order);
    onReorder(sourceId, nextOrder);
  }

  const allSelected = allRows.length > 0 && allRows.every((r) => selectedIds.has(r.task.id));
  const someSelected = allRows.some((r) => selectedIds.has(r.task.id));

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[880px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="w-14 px-2 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={!permissions.canDelete}
                ref={(el) => {
                  if (el) el.indeterminate = !allSelected && someSelected;
                }}
                onChange={(event) => onToggleSelectAll(event.target.checked)}
                aria-label="Select all visible tasks"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
              />
            </th>
            <th scope="col" className="px-1 py-2">
              Task
            </th>
            {visibleColumns.assignees && (
              <th scope="col" className="w-24 px-2 py-2">
                Assignees
              </th>
            )}
            {visibleColumns.dueDate && (
              <th scope="col" className="w-36 px-2 py-2">
                Due date
              </th>
            )}
            {visibleColumns.priority && (
              <th scope="col" className="w-32 px-2 py-2">
                Priority
              </th>
            )}
            {visibleColumns.status && (
              <th scope="col" className="w-40 px-2 py-2">
                Status
              </th>
            )}
            {visibleCustomFields.map((field) => (
              <th key={field.id} scope="col" className="w-32 px-2 py-2">
                {field.name}
              </th>
            ))}
            <th scope="col" className="w-10 px-2 py-2" aria-hidden="true" />
          </tr>
        </thead>
        {groups.map((group) => (
          <TaskGroup
            key={group.key}
            label={group.label}
            rows={group.rows}
            assignees={assignees}
            statuses={statuses}
            priorities={priorities}
            visibleColumns={visibleColumns}
            visibleCustomFields={visibleCustomFields}
            attachmentCounts={attachmentCounts}
            selectedIds={selectedIds}
            collapsedIds={collapsedIds}
            dragEnabled={dragEnabled}
            permissions={permissions}
            showGroupHeader={groupField !== "none"}
            onToggleSelect={onToggleSelect}
            onToggleCollapse={onToggleCollapse}
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
        {permissions.canCreate && (
          <tbody>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td colSpan={columnCount} className="p-0">
                <NewTaskRow onCreate={onCreate} />
              </td>
            </tr>
          </tbody>
        )}
      </table>
    </div>
  );
}
