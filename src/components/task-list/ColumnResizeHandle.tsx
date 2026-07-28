"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";

interface ColumnResizeHandleProps {
  columnId: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  onResize: (columnId: string, width: number, persist: boolean) => void;
}

/** A draggable strip on a <th>'s right edge that resizes the matching <col> (see TaskTable's colgroup). Live-updates while dragging, persists once on release; double-click resets to the default width. */
export function ColumnResizeHandle({ columnId, width, minWidth, maxWidth, defaultWidth, onResize }: ColumnResizeHandleProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  function clamp(next: number) {
    return Math.min(maxWidth, Math.max(minWidth, next));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startWidth: width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onPointerMove(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!dragRef.current) return;
    onResize(columnId, clamp(dragRef.current.startWidth + (event.clientX - dragRef.current.startX)), false);
  }

  function endDrag(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!dragRef.current) return;
    onResize(columnId, clamp(dragRef.current.startWidth + (event.clientX - dragRef.current.startX)), true);
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onResize(columnId, defaultWidth, true)}
      className={cn(
        "absolute right-0 top-0 z-10 h-full w-2 -translate-x-1/2 cursor-col-resize touch-none select-none",
        "after:absolute after:inset-y-1 after:right-1/2 after:w-px after:translate-x-1/2 after:rounded-full after:bg-transparent after:transition-colors",
        "hover:after:bg-indigo-400 dark:hover:after:bg-indigo-500"
      )}
    />
  );
}
