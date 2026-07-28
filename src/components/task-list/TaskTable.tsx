"use client";

import { useMemo, useRef } from "react";
import { TaskGroup } from "./TaskGroup";
import { NewTaskRow } from "./NewTaskRow";
import { ColumnResizeHandle } from "./ColumnResizeHandle";
import { CustomFieldHeaderMenu } from "./CustomFieldHeaderMenu";
import { AddCustomFieldPopover } from "./AddCustomFieldPopover";
import type { VisibleColumns } from "./TaskRow";
import { computeOrderBetween } from "@/lib/taskQuery";
import { applyColumnOrder } from "@/lib/columnOrder";
import { useColumnDragReorder } from "@/hooks/useColumnDragReorder";
import { COLOR_PALETTE } from "@/config/colorPalette";
import { GripVerticalIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Assignee, GroupField, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { CustomFieldDef, CustomFieldOption, CustomFieldType } from "@/types/customField";
import type { FlatTreeRow } from "@/lib/taskTree";
import type { TaskPermissions } from "@/lib/taskPermissions";
import type { Team } from "@/types/team";

export interface TaskTableGroup {
  key: string;
  label: string;
  rows: FlatTreeRow[];
}

interface ColumnDef {
  id: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  /** Present only for user-manageable custom-field columns. */
  field?: CustomFieldDef;
}

const FIXED_COLUMNS: Record<keyof VisibleColumns, ColumnDef> = {
  assignees: { id: "assignees", label: "Assignees", defaultWidth: 96, minWidth: 70 },
  team: { id: "team", label: "Department", defaultWidth: 112, minWidth: 80 },
  dueDate: { id: "dueDate", label: "Due date", defaultWidth: 144, minWidth: 110 },
  priority: { id: "priority", label: "Priority", defaultWidth: 128, minWidth: 90 },
  status: { id: "status", label: "Status", defaultWidth: 160, minWidth: 100 },
};

const TASK_COLUMN: ColumnDef = { id: "task", label: "Task", defaultWidth: 260, minWidth: 180 };
const MAX_COLUMN_WIDTH = 640;

const CUSTOM_FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  image: "Image",
  video: "Video",
  link: "Link",
};

interface TaskTableProps {
  groups: TaskTableGroup[];
  allTasksById: Map<string, Task>;
  assignees: Assignee[];
  teams: Team[];
  columnWidths: Record<string, number>;
  onResizeColumn: (columnId: string, width: number, persist: boolean) => void;
  columnOrder: string[];
  onReorderColumns: (nextOrder: string[]) => void;
  statuses: StatusDef[];
  priorities: PriorityDef[];
  visibleColumns: VisibleColumns;
  visibleCustomFields: CustomFieldDef[];
  canManageFields: boolean;
  onAddCustomField: (input: { name: string; type: CustomFieldType; options: CustomFieldOption[] }) => Promise<boolean>;
  onRenameCustomField: (id: string, name: string) => void;
  onSetCustomFieldOptions: (id: string, options: CustomFieldOption[]) => void;
  onDeleteCustomField: (id: string) => void;
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
  teams,
  columnWidths,
  onResizeColumn,
  columnOrder,
  onReorderColumns,
  statuses,
  priorities,
  visibleColumns,
  visibleCustomFields,
  canManageFields,
  onAddCustomField,
  onRenameCustomField,
  onSetCustomFieldOptions,
  onDeleteCustomField,
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

  // The data columns (everything but the pinned Task column) are freely
  // reorderable by drag; `columnOrder` is the user's saved preference,
  // reconciled against whichever columns are actually visible right now.
  const orderedDataColumnIds = useMemo(() => {
    const natural: string[] = [];
    for (const key of Object.keys(FIXED_COLUMNS) as (keyof VisibleColumns)[]) {
      if (visibleColumns[key]) natural.push(key);
    }
    for (const field of visibleCustomFields) natural.push(field.id);
    return applyColumnOrder(natural, columnOrder);
  }, [visibleColumns, visibleCustomFields, columnOrder]);

  const columnCount = 3 + orderedDataColumnIds.length + (canManageFields ? 1 : 0);

  const customFieldById = useMemo(() => new Map(visibleCustomFields.map((f) => [f.id, f])), [visibleCustomFields]);

  const resizableColumns: ColumnDef[] = useMemo(() => {
    return [
      TASK_COLUMN,
      ...orderedDataColumnIds.map((id) => {
        const field = customFieldById.get(id);
        if (field) return { id: field.id, label: field.name, defaultWidth: 128, minWidth: 80, field };
        return FIXED_COLUMNS[id as keyof VisibleColumns];
      }),
    ];
  }, [orderedDataColumnIds, customFieldById]);

  const { onDragStart: onColumnDragStart, onDragOverColumn, onDrop: onColumnDrop, onDragEnd: onColumnDragEnd, dropTarget: columnDropTarget } = useColumnDragReorder(
    orderedDataColumnIds,
    onReorderColumns
  );

  const customFieldIndexById = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;
    for (const id of orderedDataColumnIds) {
      if (!customFieldById.has(id)) continue;
      map.set(id, index);
      index += 1;
    }
    return map;
  }, [orderedDataColumnIds, customFieldById]);

  function widthOf(col: ColumnDef): number {
    return columnWidths[col.id] ?? col.defaultWidth;
  }

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
  // table-layout:fixed ignores content for sizing, so the table's own width
  // is driven explicitly from the column widths (min 880px, same as the old
  // static layout) rather than left to "auto", which some browsers just
  // clamp to the container instead of letting it grow for horizontal scroll.
  const tableWidth = Math.max(880, 56 + 40 + (canManageFields ? 36 : 0) + resizableColumns.reduce((sum, col) => sum + widthOf(col), 0));

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-slate-900">
      <table className="border-collapse" style={{ tableLayout: "fixed", width: tableWidth }}>
        <colgroup>
          <col style={{ width: 56 }} />
          {resizableColumns.map((col) => (
            <col key={col.id} style={{ width: widthOf(col) }} />
          ))}
          {canManageFields && <col style={{ width: 36 }} />}
          <col style={{ width: 40 }} />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="px-2 py-2">
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
            {resizableColumns.map((col) => {
              const draggable = col.id !== TASK_COLUMN.id;
              const isDropTarget = columnDropTarget?.id === col.id;
              return (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "group relative truncate px-1 py-2",
                    isDropTarget && columnDropTarget?.edge === "before" && "shadow-[inset_2px_0_0_0_theme(colors.indigo.500)]",
                    isDropTarget && columnDropTarget?.edge === "after" && "shadow-[inset_-2px_0_0_0_theme(colors.indigo.500)]"
                  )}
                  onDragOver={draggable ? (event) => onDragOverColumn(event, col.id) : undefined}
                  onDrop={draggable ? () => onColumnDrop(col.id) : undefined}
                >
                  <div className="flex items-center gap-0.5">
                    {draggable && (
                      <span
                        draggable
                        onDragStart={() => onColumnDragStart(col.id)}
                        onDragEnd={onColumnDragEnd}
                        className="cursor-grab text-slate-300 opacity-0 group-hover:opacity-100 dark:text-slate-600"
                        aria-hidden="true"
                      >
                        <GripVerticalIcon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {col.field ? (
                        canManageFields ? (
                          <CustomFieldHeaderMenu
                            field={col.field}
                            typeLabel={CUSTOM_FIELD_TYPE_LABEL[col.field.type]}
                            accentColor={COLOR_PALETTE[(customFieldIndexById.get(col.field.id) ?? 0) % COLOR_PALETTE.length]}
                            onRename={(name) => onRenameCustomField(col.field!.id, name)}
                            onSetOptions={(options) => onSetCustomFieldOptions(col.field!.id, options)}
                            onDelete={() => onDeleteCustomField(col.field!.id)}
                          />
                        ) : (
                          col.label
                        )
                      ) : (
                        col.label
                      )}
                    </span>
                  </div>
                  <ColumnResizeHandle
                    columnId={col.id}
                    width={widthOf(col)}
                    minWidth={col.minWidth}
                    maxWidth={MAX_COLUMN_WIDTH}
                    defaultWidth={col.defaultWidth}
                    onResize={onResizeColumn}
                  />
                </th>
              );
            })}
            {canManageFields && (
              <th scope="col" className="px-1 py-2 align-top">
                <AddCustomFieldPopover onAdd={onAddCustomField} />
              </th>
            )}
            <th scope="col" className="px-2 py-2" aria-hidden="true" />
          </tr>
        </thead>
        {groups.map((group) => (
          <TaskGroup
            key={group.key}
            label={group.label}
            rows={group.rows}
            assignees={assignees}
            teams={teams}
            statuses={statuses}
            priorities={priorities}
            columnOrder={orderedDataColumnIds}
            columnCount={columnCount}
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
