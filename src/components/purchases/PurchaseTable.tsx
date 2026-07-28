"use client";

import { useMemo, useState } from "react";
import { PurchaseColumnHeader } from "./PurchaseColumnHeader";
import { AddColumnPopover } from "./AddColumnPopover";
import { PurchaseValueCell } from "./PurchaseValueCell";
import { ColumnResizeHandle } from "@/components/task-list/ColumnResizeHandle";
import { AssigneeMenu } from "@/components/task-list/AssigneeMenu";
import { UserExcludeMenu } from "@/components/ui/UserExcludeMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GripVerticalIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { COLOR_PALETTE } from "@/config/colorPalette";
import { applyColumnOrder } from "@/lib/columnOrder";
import { useColumnDragReorder } from "@/hooks/useColumnDragReorder";
import { cn } from "@/lib/cn";
import type { Assignee } from "@/types/task";
import type { PurchaseColumnDef, PurchaseColumnType, PurchaseDropdownOption, PurchaseItem } from "@/types/purchase";

const TYPE_LABEL: Record<PurchaseColumnType, string> = {
  text: "Text",
  number: "Number",
  dropdown: "Dropdown",
  date: "Date",
  image: "Image",
  video: "Video",
  link: "Link",
};

const DEFAULT_SIZE: Record<PurchaseColumnType, { width: number; min: number }> = {
  text: { width: 180, min: 100 },
  number: { width: 110, min: 70 },
  dropdown: { width: 160, min: 100 },
  date: { width: 140, min: 100 },
  image: { width: 90, min: 70 },
  video: { width: 110, min: 80 },
  link: { width: 140, min: 90 },
};

export const ASSIGNED_TO_COLUMN_ID = "purchase-assigned-to";
export const EXCLUDED_COLUMN_ID = "purchase-excluded";
const ASSIGNED_TO_SIZE = { width: 150, min: 110 };
const EXCLUDED_SIZE = { width: 170, min: 120 };
const MAX_COLUMN_WIDTH = 640;

interface PurchaseTableProps {
  columns: PurchaseColumnDef[];
  items: PurchaseItem[];
  assignees: Assignee[];
  columnWidths: Record<string, number>;
  onResizeColumn: (columnId: string, width: number, persist: boolean) => void;
  columnOrder: string[];
  onReorderColumns: (nextOrder: string[]) => void;
  /** Column ids an admin has hidden for the current user — always excluded, regardless of drag order. */
  hiddenColumnIds?: string[];
  onAddColumn: (input: { name: string; type: PurchaseColumnType; options: PurchaseDropdownOption[] }) => Promise<boolean>;
  onRenameColumn: (id: string, name: string) => void;
  onSetColumnOptions: (id: string, options: PurchaseDropdownOption[]) => void;
  onDeleteColumn: (id: string) => void;
  onAddItem: () => void;
  onUpdateItemValues: (id: string, values: Record<string, string>) => void;
  onUpdateItemAssignees: (id: string, assigneeIds: string[]) => void;
  onUpdateItemExcludedUsers: (id: string, excludedUserIds: string[]) => void;
  onDeleteItem: (id: string) => void;
}

export function PurchaseTable({
  columns,
  items,
  assignees,
  columnWidths,
  onResizeColumn,
  columnOrder,
  onReorderColumns,
  hiddenColumnIds = [],
  onAddColumn,
  onRenameColumn,
  onSetColumnOptions,
  onDeleteColumn,
  onAddItem,
  onUpdateItemValues,
  onUpdateItemAssignees,
  onUpdateItemExcludedUsers,
  onDeleteItem,
}: PurchaseTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const columnById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  // Default arrangement (before any user drag): "Assigned to" sits right
  // after the first dynamic column; a saved columnOrder preference overrides this.
  // Admin-hidden columns are excluded regardless of order.
  const orderedColumnIds = useMemo(() => {
    const [first, ...rest] = columns;
    const natural = first
      ? [first.id, ASSIGNED_TO_COLUMN_ID, EXCLUDED_COLUMN_ID, ...rest.map((c) => c.id)]
      : [ASSIGNED_TO_COLUMN_ID, EXCLUDED_COLUMN_ID];
    return applyColumnOrder(natural, columnOrder).filter((id) => !hiddenColumnIds.includes(id));
  }, [columns, columnOrder, hiddenColumnIds]);

  const columnCount = orderedColumnIds.length + 2;

  function widthOf(columnId: string, fallback: number): number {
    return columnWidths[columnId] ?? fallback;
  }

  function defaultSizeFor(id: string) {
    if (id === ASSIGNED_TO_COLUMN_ID) return ASSIGNED_TO_SIZE;
    if (id === EXCLUDED_COLUMN_ID) return EXCLUDED_SIZE;
    const column = columnById.get(id);
    return column ? DEFAULT_SIZE[column.type] : { width: 140, min: 90 };
  }

  const { onDragStart, onDragOverColumn, onDrop, onDragEnd, dropTarget } = useColumnDragReorder(orderedColumnIds, onReorderColumns);

  const accentIndexById = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;
    for (const id of orderedColumnIds) {
      if (id === ASSIGNED_TO_COLUMN_ID || id === EXCLUDED_COLUMN_ID) continue;
      map.set(id, index);
      index += 1;
    }
    return map;
  }, [orderedColumnIds]);

  // table-layout:fixed ignores content for sizing, so the table's own width
  // is driven explicitly from the column widths, same approach as TaskTable.
  const tableWidth = Math.max(720, orderedColumnIds.reduce((sum, id) => sum + widthOf(id, defaultSizeFor(id).width), 0) + 80);

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="border-collapse" style={{ tableLayout: "fixed", width: tableWidth }}>
        <colgroup>
          {orderedColumnIds.map((id) => (
            <col key={id} style={{ width: widthOf(id, defaultSizeFor(id).width) }} />
          ))}
          <col style={{ width: 40 }} />
          <col style={{ width: 40 }} />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {orderedColumnIds.map((id) => {
              const isAssignedTo = id === ASSIGNED_TO_COLUMN_ID;
              const isExcluded = id === EXCLUDED_COLUMN_ID;
              const column = columnById.get(id);
              const size = defaultSizeFor(id);
              const isDropTarget = dropTarget?.id === id;
              return (
                <th
                  key={id}
                  scope="col"
                  className={cn(
                    "group relative px-2 py-1.5 align-top",
                    isDropTarget && dropTarget?.edge === "before" && "shadow-[inset_2px_0_0_0_theme(colors.indigo.500)]",
                    isDropTarget && dropTarget?.edge === "after" && "shadow-[inset_-2px_0_0_0_theme(colors.indigo.500)]"
                  )}
                  onDragOver={(event) => onDragOverColumn(event, id)}
                  onDrop={() => onDrop(id)}
                >
                  <div className="flex items-start gap-0.5">
                    <span
                      draggable
                      onDragStart={() => onDragStart(id)}
                      onDragEnd={onDragEnd}
                      className="mt-0.5 shrink-0 cursor-grab text-slate-300 opacity-0 group-hover:opacity-100 dark:text-slate-600"
                      aria-hidden="true"
                    >
                      <GripVerticalIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {isAssignedTo ? (
                        <>
                          Assigned to
                          <span className="block text-[10px] font-normal normal-case text-slate-400">Assignee</span>
                        </>
                      ) : isExcluded ? (
                        <>
                          Excluded
                          <span className="block text-[10px] font-normal normal-case text-slate-400">Hidden from</span>
                        </>
                      ) : column ? (
                        <PurchaseColumnHeader
                          column={column}
                          typeLabel={TYPE_LABEL[column.type]}
                          accentColor={COLOR_PALETTE[(accentIndexById.get(id) ?? 0) % COLOR_PALETTE.length]}
                          onRename={(name) => onRenameColumn(column.id, name)}
                          onSetOptions={(options) => onSetColumnOptions(column.id, options)}
                          onDelete={() => onDeleteColumn(column.id)}
                        />
                      ) : null}
                    </div>
                  </div>
                  <ColumnResizeHandle
                    columnId={id}
                    width={widthOf(id, size.width)}
                    minWidth={size.min}
                    maxWidth={MAX_COLUMN_WIDTH}
                    defaultWidth={size.width}
                    onResize={onResizeColumn}
                  />
                </th>
              );
            })}
            <th scope="col" className="px-1 py-1.5 align-top">
              <AddColumnPopover onAdd={onAddColumn} />
            </th>
            <th scope="col" className="px-1 py-1.5" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-slate-400">
                No purchases yet. Add your first row below.
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr
              key={item.id}
              className="group border-b border-slate-100 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              {orderedColumnIds.map((id) => {
                if (id === ASSIGNED_TO_COLUMN_ID) {
                  return (
                    <td key={id} className="overflow-hidden px-2 py-1.5">
                      <AssigneeMenu assignees={assignees} value={item.assigneeIds} onChange={(assigneeIds) => onUpdateItemAssignees(item.id, assigneeIds)} />
                    </td>
                  );
                }
                if (id === EXCLUDED_COLUMN_ID) {
                  return (
                    <td key={id} className="overflow-hidden px-2 py-1.5">
                      <UserExcludeMenu
                        users={assignees}
                        value={item.excludedUserIds ?? []}
                        onChange={(excludedUserIds) => onUpdateItemExcludedUsers(item.id, excludedUserIds)}
                      />
                    </td>
                  );
                }
                const column = columnById.get(id);
                if (!column) return null;
                return (
                  <td key={id} className="overflow-hidden px-2 py-1.5">
                    <PurchaseValueCell column={column} value={item.values[id] ?? ""} onChange={(next) => onUpdateItemValues(item.id, { [id]: next })} />
                  </td>
                );
              })}
              <td />
              <td className="px-1 py-1.5 text-right">
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(item.id)}
                  className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-hover:opacity-100 dark:hover:bg-red-950 dark:hover:text-red-400"
                  aria-label="Delete row"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tbody>
          <tr className="border-t border-slate-100 dark:border-slate-800">
            <td colSpan={columnCount} className="p-0">
              <button
                type="button"
                onClick={onAddItem}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
              >
                <PlusIcon className="h-4 w-4 shrink-0 text-slate-400" />
                Add purchase
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this row?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDeleteId) onDeleteItem(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
