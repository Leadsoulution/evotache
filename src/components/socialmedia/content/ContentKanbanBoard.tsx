"use client";

import { useMemo, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { computeOrderBetween } from "@/lib/taskQuery";
import { PlusIcon } from "@/components/ui/icons";

export interface KanbanColumnDef {
  id: string;
  label: string;
  color: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

export interface KanbanCardRenderState {
  dragging: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOverCard: (event: DragEvent<HTMLDivElement>) => void;
}

interface ContentKanbanBoardProps<T extends { id: string; order: number }> {
  columns: KanbanColumnDef[];
  items: T[];
  getColumnId: (item: T) => string;
  renderCard: (item: T, state: KanbanCardRenderState) => ReactNode;
  onMove: (id: string, columnId: string, order: number) => void;
  canCreate: boolean;
  onAddClick?: (columnId: string) => void;
}

export function ContentKanbanBoard<T extends { id: string; order: number }>({
  columns,
  items,
  getColumnId,
  renderCard,
  onMove,
  canCreate,
  onAddClick,
}: ContentKanbanBoardProps<T>) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const itemsByColumn = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const column of columns) map.set(column.id, []);
    for (const item of items) {
      const list = map.get(getColumnId(item)) ?? [];
      list.push(item);
      map.set(getColumnId(item), list);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [items, columns, getColumnId]);

  function handleDrop(columnId: string) {
    if (!draggedId || !dropTarget) return;
    const dragged = items.find((i) => i.id === draggedId);
    if (!dragged) return;
    const columnItems = (itemsByColumn.get(columnId) ?? []).filter((i) => i.id !== draggedId);
    const index = Math.min(dropTarget.index, columnItems.length);
    const before = columnItems[index - 1]?.order;
    const after = columnItems[index]?.order;
    const order = computeOrderBetween(before, after);
    if (getColumnId(dragged) !== columnId || dragged.order !== order) {
      onMove(draggedId, columnId, order);
    }
    setDraggedId(null);
    setDropTarget(null);
  }

  return (
    <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
      {columns.map((column) => {
        const columnItems = itemsByColumn.get(column.id) ?? [];
        return (
          <div
            key={column.id}
            className="flex min-w-64 flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
            onDragOver={(event) => {
              if (!draggedId) return;
              event.preventDefault();
              if (columnItems.length === 0) setDropTarget({ columnId: column.id, index: 0 });
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(column.id);
            }}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.label}</span>
              <span className="text-xs font-medium text-slate-400">{columnItems.length}</span>
              {canCreate && onAddClick && (
                <button
                  type="button"
                  onClick={() => onAddClick(column.id)}
                  className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  aria-label={`Add to ${column.label}`}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2.5">
              {columnItems.map((item, index) => (
                <div key={item.id}>
                  {dropTarget?.columnId === column.id && dropTarget.index === index && <div className="mb-2 h-1 rounded-full bg-indigo-400" />}
                  {renderCard(item, {
                    dragging: draggedId === item.id,
                    onDragStart: (event) => {
                      setDraggedId(item.id);
                      event.dataTransfer.effectAllowed = "move";
                    },
                    onDragEnd: () => {
                      setDraggedId(null);
                      setDropTarget(null);
                    },
                    onDragOverCard: (event) => {
                      if (!draggedId || draggedId === item.id) return;
                      event.preventDefault();
                      event.stopPropagation();
                      const rect = event.currentTarget.getBoundingClientRect();
                      const before = event.clientY < rect.top + rect.height / 2;
                      setDropTarget({ columnId: column.id, index: before ? index : index + 1 });
                    },
                  })}
                </div>
              ))}

              {dropTarget?.columnId === column.id && dropTarget.index === columnItems.length && columnItems.length > 0 && (
                <div className="h-1 rounded-full bg-indigo-400" />
              )}

              {columnItems.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700">Empty</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
