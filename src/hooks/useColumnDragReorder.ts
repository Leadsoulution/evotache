"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";

export interface ColumnDropTarget {
  id: string;
  edge: "before" | "after";
}

/** HTML5 drag-and-drop reordering for a table's column headers. Columns are a
 * small, bounded list, so a plain drop-and-splice reorder is used instead of
 * the fractional-order scheme rows use. */
export function useColumnDragReorder(orderedIds: string[], onReorder: (nextOrder: string[]) => void) {
  const draggedId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ColumnDropTarget | null>(null);

  function onDragStart(id: string) {
    draggedId.current = id;
  }

  function onDragOverColumn(event: DragEvent<HTMLElement>, id: string) {
    if (!draggedId.current) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const edge: ColumnDropTarget["edge"] = event.clientX - rect.left < rect.width / 2 ? "before" : "after";
    setDropTarget((current) => (current?.id === id && current.edge === edge ? current : { id, edge }));
  }

  function onDrop(targetId: string) {
    const sourceId = draggedId.current;
    const edge = dropTarget?.edge ?? "before";
    draggedId.current = null;
    setDropTarget(null);
    if (!sourceId || sourceId === targetId) return;
    const withoutSource = orderedIds.filter((id) => id !== sourceId);
    const targetIndex = withoutSource.indexOf(targetId);
    if (targetIndex === -1) return;
    const insertAt = edge === "before" ? targetIndex : targetIndex + 1;
    onReorder([...withoutSource.slice(0, insertAt), sourceId, ...withoutSource.slice(insertAt)]);
  }

  function onDragEnd() {
    draggedId.current = null;
    setDropTarget(null);
  }

  return { onDragStart, onDragOverColumn, onDrop, onDragEnd, dropTarget };
}
