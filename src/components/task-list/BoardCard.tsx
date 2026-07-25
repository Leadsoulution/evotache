"use client";

import type { DragEvent } from "react";
import { PriorityMenu } from "./PriorityMenu";
import { AssigneeMenu } from "./AssigneeMenu";
import { DueDateField } from "./DueDateField";
import { PaperclipIcon, TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Assignee, Task } from "@/types/task";
import type { PriorityDef } from "@/types/taskMeta";
import type { TaskPermissions } from "@/lib/taskPermissions";

interface BoardCardProps {
  task: Task;
  parentTitle: string | null;
  assignees: Assignee[];
  priorities: PriorityDef[];
  attachmentCount: number;
  permissions: TaskPermissions;
  dragEnabled: boolean;
  dragging: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRequestDelete: (id: string) => void;
  onOpenDetail: (task: Task) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOverCard: (event: DragEvent<HTMLDivElement>) => void;
}

export function BoardCard({
  task,
  parentTitle,
  assignees,
  priorities,
  attachmentCount,
  permissions,
  dragEnabled,
  dragging,
  onUpdate,
  onRequestDelete,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  onDragOverCard,
}: BoardCardProps) {
  return (
    <div
      draggable={dragEnabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        dragEnabled && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      {parentTitle && <span className="truncate text-[11px] font-medium text-slate-400">{parentTitle}</span>}

      <button
        type="button"
        onClick={() => onOpenDetail(task)}
        className={cn(
          "text-left text-sm font-medium text-slate-800 dark:text-slate-100",
          task.status === "done" && "text-slate-400 line-through dark:text-slate-500"
        )}
      >
        {task.title}
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityMenu value={task.priority} priorities={priorities} onChange={(priority) => onUpdate(task.id, { priority })} readOnly={!permissions.canEditFull} />
        <DueDateField value={task.dueDate} onChange={(dueDate) => onUpdate(task.id, { dueDate })} readOnly={!permissions.canEditFull} />
      </div>

      <div className="flex items-center gap-2">
        <AssigneeMenu assignees={assignees} value={task.assigneeIds} onChange={(assigneeIds) => onUpdate(task.id, { assigneeIds })} readOnly={!permissions.canEditFull} />
        <div className="ml-auto flex items-center gap-1.5">
          {attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-slate-400">
              <PaperclipIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{attachmentCount}</span>
            </span>
          )}
          {permissions.canDelete && (
            <button
              type="button"
              onClick={() => onRequestDelete(task.id)}
              className="rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              aria-label={`Delete task ${task.title}`}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
