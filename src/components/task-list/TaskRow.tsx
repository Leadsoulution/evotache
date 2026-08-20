"use client";

import { useState } from "react";
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { StatusMenu } from "./StatusMenu";
import { PriorityMenu } from "./PriorityMenu";
import { AssigneeMenu } from "./AssigneeMenu";
import { TeamMenu } from "./TeamMenu";
import { DueDateMenu } from "./DueDateMenu";
import { InlineEditableText } from "./InlineEditableText";
import { CustomFieldCell } from "./CustomFieldCell";
import { ChevronDownIcon, EyeIcon, GripVerticalIcon, ListChecksIcon, PaperclipIcon, PlusIcon, RepeatIcon, TrashIcon } from "@/components/ui/icons";
import { describeRecurrence } from "@/lib/recurrence";
import { cn } from "@/lib/cn";
import type { Assignee, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { CustomFieldDef } from "@/types/customField";
import type { TaskPermissions } from "@/lib/taskPermissions";
import type { Team } from "@/types/team";

export interface VisibleColumns {
  assignees: boolean;
  team: boolean;
  dueDate: boolean;
  priority: boolean;
  status: boolean;
}

interface TaskRowProps {
  task: Task;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  assignees: Assignee[];
  teams: Team[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  /** Data column ids (fixed field names + custom field ids) in display order — drives both the header and this row's cells so they always stay aligned. */
  columnOrder: string[];
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
  onDropOn: (id: string, edge: "before" | "after" | "onto") => void;
}

export function TaskRow({
  task,
  depth,
  hasChildren,
  childCount,
  collapsed,
  onToggleCollapse,
  assignees,
  teams,
  statuses,
  priorities,
  columnOrder,
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
  const [dragHover, setDragHover] = useState<"before" | "after" | "onto" | null>(null);

  // Top/bottom quarters reorder as a sibling; the middle half drops the
  // dragged task in as a subtask of this row (nesting via drag).
  function computeEdge(event: ReactDragEvent<HTMLTableRowElement>): "before" | "after" | "onto" {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    return ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "onto";
  }

  function handleDragOver(event: ReactDragEvent<HTMLTableRowElement>) {
    if (!dragEnabled) return;
    event.preventDefault();
    // Must match the dragstart's effectAllowed ("move"), or some
    // browsers (notably Windows Chrome/Edge) silently refuse the drop —
    // showing a "not allowed" cursor and never firing the drop event —
    // even though preventDefault() was called here.
    event.dataTransfer.dropEffect = "move";
    setDragHover(computeEdge(event));
  }

  function handleDrop(event: ReactDragEvent<HTMLTableRowElement>) {
    if (!dragEnabled) return;
    event.preventDefault();
    // Recomputed fresh from the event rather than trusting the `dragHover`
    // state: some browsers fire a spurious dragleave (with no relatedTarget)
    // right before the drop, which would otherwise reset the state to null
    // at the exact moment we need it and make the drop silently no-op.
    onDropOn(task.id, computeEdge(event));
    setDragHover(null);
  }

  function handleDragLeave(event: ReactDragEvent<HTMLTableRowElement>) {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
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

  const priorityColor = priorities.find((p) => p.id === task.priority)?.color ?? "#cbd5e1";
  // Every <td> shares this so the row reads as one continuous card despite
  // border-collapse:separate giving each cell its own border.
  const cellClass = cn(
    "overflow-hidden border-y border-amber-100 bg-amber-50 px-2 py-1.5 group-hover:bg-amber-100 dark:border-amber-950 dark:bg-amber-950/20 dark:group-hover:bg-amber-950/40",
    selected && "!bg-indigo-50/60 dark:!bg-indigo-950/30",
    dragHover === "before" && "!border-t-2 !border-t-indigo-500",
    dragHover === "after" && "!border-b-2 !border-b-indigo-500",
    dragHover === "onto" && "!bg-indigo-100 ring-1 ring-inset ring-indigo-400 dark:!bg-indigo-950/50 dark:ring-indigo-500"
  );

  return (
    <tr
      className="group text-sm"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      <td className={cn(cellClass, "rounded-l-lg !p-0")}>
        <div
          className="flex h-full items-center gap-1 border-l-4 px-2 py-1.5"
          style={{ marginLeft: depth * 14, borderLeftColor: priorityColor }}
        >
          <span
            draggable={dragEnabled}
            onDragStart={(event) => {
              // Some browsers (Firefox in particular) refuse to start a
              // native drag unless dataTransfer carries data.
              event.dataTransfer.setData("text/plain", task.id);
              event.dataTransfer.effectAllowed = "move";
              onDragStart(task.id);
            }}
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
      <td className={cellClass}>
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
          {task.recurrence && (
            <span className="shrink-0 text-indigo-400 dark:text-indigo-300" title={describeRecurrence(task.recurrence)}>
              <RepeatIcon className="h-3.5 w-3.5" />
            </span>
          )}
          {hasChildren && (
            <span className="flex shrink-0 items-center gap-0.5 text-slate-400" title={`${childCount} subtask(s)`}>
              <ListChecksIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{childCount}</span>
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-slate-400" title={`${attachmentCount} attachment(s)`}>
              <PaperclipIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{attachmentCount}</span>
            </span>
          )}
          <div className="flex shrink-0 items-center">
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
      {columnOrder.map((columnId) => {
        switch (columnId) {
          case "assignees":
            return (
              <td key="assignees" className={cellClass}>
                <AssigneeMenu
                  assignees={assignees}
                  value={task.assigneeIds}
                  onChange={(assigneeIds) => onUpdate(task.id, { assigneeIds })}
                  readOnly={!permissions.canEditFull}
                />
              </td>
            );
          case "team":
            return (
              <td key="team" className={cellClass}>
                <TeamMenu teams={teams} value={task.teamIds ?? []} onChange={(teamIds) => onUpdate(task.id, { teamIds })} readOnly={!permissions.canEditFull} />
              </td>
            );
          case "dueDate":
            return (
              <td key="dueDate" className={cellClass}>
                <DueDateMenu dueDate={task.dueDate} onChangeDue={(dueDate) => onUpdate(task.id, { dueDate })} readOnly={!permissions.canEditFull} />
              </td>
            );
          case "priority":
            return (
              <td key="priority" className={cellClass}>
                <PriorityMenu
                  value={task.priority}
                  priorities={priorities}
                  onChange={(priority) => onUpdate(task.id, { priority })}
                  readOnly={!permissions.canEditFull}
                />
              </td>
            );
          case "status":
            return (
              <td key="status" className={cellClass}>
                <StatusMenu value={task.status} statuses={statuses} onChange={(status) => onUpdate(task.id, { status })} readOnly={!permissions.canEditStatus} />
              </td>
            );
          default: {
            const field = visibleCustomFields.find((f) => f.id === columnId);
            if (!field) return null;
            return (
              <td key={field.id} className={cellClass}>
                <CustomFieldCell
                  field={field}
                  value={task.customValues[field.id] ?? ""}
                  onChange={(value) => onUpdate(task.id, { customValues: { ...task.customValues, [field.id]: value } })}
                  readOnly={!permissions.canEditFull}
                />
              </td>
            );
          }
        }
      })}
      <td className={cn(cellClass, "rounded-r-lg text-right")}>
        {permissions.canDelete && (
          <button
            type="button"
            onClick={() => onRequestDelete(task.id)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label={`Delete task ${task.title}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}
