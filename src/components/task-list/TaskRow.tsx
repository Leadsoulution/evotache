"use client";

import { useState } from "react";
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { StatusMenu } from "./StatusMenu";
import { PriorityMenu } from "./PriorityMenu";
import { AssigneeMenu } from "./AssigneeMenu";
import { DueDateField } from "./DueDateField";
import { InlineEditableText } from "./InlineEditableText";
import { CustomFieldCell } from "./CustomFieldCell";
import { ChevronDownIcon, EyeIcon, GripVerticalIcon, PaperclipIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Assignee, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { CustomFieldDef } from "@/types/customField";
import type { TaskPermissions } from "@/lib/taskPermissions";

export interface VisibleColumns {
  assignees: boolean;
  dueDate: boolean;
  priority: boolean;
  status: boolean;
}

interface TaskRowProps {
  task: Task;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  assignees: Assignee[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  visibleColumns: VisibleColumns;
  visibleCustomFields: CustomFieldDef[];
  attachmentCount: number;
  selected: boolean;
  dragEnabled: boolean;
  permissions: TaskPermissions;
  onToggleSelect: (id: string, checked: boolean) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRequestDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onOpenDetail: (task: Task) => void;
  registerCheckboxRef: (id: string, el: HTMLInputElement | null) => void;
  onCheckboxKeyNav: (id: string, direction: 1 | -1) => void;
  onDragStart: (id: string) => void;
  onDropOn: (id: string, edge: "before" | "after") => void;
}

export function TaskRow({
  task,
  depth,
  hasChildren,
  collapsed,
  onToggleCollapse,
  assignees,
  statuses,
  priorities,
  visibleColumns,
  visibleCustomFields,
  attachmentCount,
  selected,
  dragEnabled,
  permissions,
  onToggleSelect,
  onUpdate,
  onRequestDelete,
  onAddSubtask,
  onOpenDetail,
  registerCheckboxRef,
  onCheckboxKeyNav,
  onDragStart,
  onDropOn,
}: TaskRowProps) {
  const [dragHover, setDragHover] = useState<"before" | "after" | null>(null);

  function handleDragOver(event: ReactDragEvent<HTMLTableRowElement>) {
    if (!dragEnabled) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const edge = event.clientY - rect.top < rect.height / 2 ? "before" : "after";
    setDragHover(edge);
  }

  function handleDrop(event: ReactDragEvent<HTMLTableRowElement>) {
    if (!dragEnabled) return;
    event.preventDefault();
    if (dragHover) onDropOn(task.id, dragHover);
    setDragHover(null);
  }

  function onCheckboxKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onCheckboxKeyNav(task.id, 1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onCheckboxKeyNav(task.id, -1);
    }
  }

  return (
    <tr
      className={cn(
        "group border-b border-slate-100 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50",
        selected && "bg-indigo-50/60 dark:bg-indigo-950/30",
        dragHover === "before" && "shadow-[inset_0_2px_0_0_theme(colors.indigo.500)]",
        dragHover === "after" && "shadow-[inset_0_-2px_0_0_theme(colors.indigo.500)]"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={() => setDragHover(null)}
    >
      <td className="w-14 px-2 py-1.5">
        <div className="flex items-center gap-1">
          <span
            draggable={dragEnabled}
            onDragStart={() => onDragStart(task.id)}
            className={cn(
              "cursor-grab text-slate-300 opacity-0 group-hover:opacity-100 dark:text-slate-600",
              !dragEnabled && "invisible"
            )}
            aria-hidden="true"
          >
            <GripVerticalIcon className="h-4 w-4" />
          </span>
          <input
            ref={(el) => registerCheckboxRef(task.id, el)}
            type="checkbox"
            checked={selected}
            disabled={!permissions.canDelete}
            onChange={(event) => onToggleSelect(task.id, event.target.checked)}
            onKeyDown={onCheckboxKeyDown}
            aria-label={`Select task ${task.title}`}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
      </td>
      <td className="px-1 py-1.5">
        <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleCollapse(task.id)}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={collapsed ? "Expand subtasks" : "Collapse subtasks"}
              aria-expanded={!collapsed}
            >
              <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", collapsed && "-rotate-90")} />
            </button>
          ) : (
            <span className="w-4 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <InlineEditableText
              value={task.title}
              onSubmit={(title) => onUpdate(task.id, { title })}
              ariaLabel={`Task title: ${task.title}`}
              readOnly={!permissions.canEditFull}
              className={cn(task.status === "done" && "text-slate-400 line-through dark:text-slate-500")}
            />
          </div>
          {attachmentCount > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-slate-400" title={`${attachmentCount} attachment(s)`}>
              <PaperclipIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{attachmentCount}</span>
            </span>
          )}
          <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onOpenDetail(task)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label={`Open details for ${task.title}`}
            >
              <EyeIcon className="h-3.5 w-3.5" />
            </button>
            {permissions.canCreate && (
              <button
                type="button"
                onClick={() => onAddSubtask(task.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label={`Add subtask under ${task.title}`}
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </td>
      {visibleColumns.assignees && (
        <td className="w-24 px-2 py-1.5">
          <AssigneeMenu
            assignees={assignees}
            value={task.assigneeIds}
            onChange={(assigneeIds) => onUpdate(task.id, { assigneeIds })}
            readOnly={!permissions.canEditFull}
          />
        </td>
      )}
      {visibleColumns.dueDate && (
        <td className="w-36 px-2 py-1.5">
          <DueDateField value={task.dueDate} onChange={(dueDate) => onUpdate(task.id, { dueDate })} readOnly={!permissions.canEditFull} />
        </td>
      )}
      {visibleColumns.priority && (
        <td className="w-32 px-2 py-1.5">
          <PriorityMenu
            value={task.priority}
            priorities={priorities}
            onChange={(priority) => onUpdate(task.id, { priority })}
            readOnly={!permissions.canEditFull}
          />
        </td>
      )}
      {visibleColumns.status && (
        <td className="w-40 px-2 py-1.5">
          <StatusMenu value={task.status} statuses={statuses} onChange={(status) => onUpdate(task.id, { status })} readOnly={!permissions.canEditStatus} />
        </td>
      )}
      {visibleCustomFields.map((field) => (
        <td key={field.id} className="w-32 px-2 py-1.5">
          <CustomFieldCell
            field={field}
            value={task.customValues[field.id] ?? ""}
            onChange={(value) => onUpdate(task.id, { customValues: { ...task.customValues, [field.id]: value } })}
            readOnly={!permissions.canEditFull}
          />
        </td>
      ))}
      <td className="w-10 px-2 py-1.5 text-right">
        {permissions.canDelete && (
          <button
            type="button"
            onClick={() => onRequestDelete(task.id)}
            className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-hover:opacity-100 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label={`Delete task ${task.title}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}
