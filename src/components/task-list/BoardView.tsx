"use client";

import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { BoardCard } from "./BoardCard";
import { computeOrderBetween } from "@/lib/taskQuery";
import { PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { CreateTaskOptions } from "@/hooks/useTasks";
import type { Assignee, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { TaskPermissions } from "@/lib/taskPermissions";

interface DropTarget {
  statusId: string;
  index: number;
}

interface BoardViewProps {
  tasks: Task[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  assignees: Assignee[];
  attachmentCounts: Record<string, number>;
  permissions: TaskPermissions;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onCreate: (title: string, options?: CreateTaskOptions) => void;
  onOpenDetail: (task: Task) => void;
  onRequestDelete: (id: string) => void;
}

export function BoardView({ tasks, statuses, priorities, assignees, attachmentCounts, permissions, onUpdate, onCreate, onOpenDetail, onRequestDelete }: BoardViewProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [addingStatusId, setAddingStatusId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const titleById = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);
  const tasksByStatus = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const status of statuses) map.set(status.id, []);
    for (const task of tasks) {
      const list = map.get(task.status) ?? [];
      list.push(task);
      map.set(task.status, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [tasks, statuses]);

  const dragEnabled = permissions.canEditStatus;

  function handleDrop(statusId: string) {
    if (!draggedId || !dropTarget) return;
    const dragged = tasks.find((t) => t.id === draggedId);
    if (!dragged) return;
    const columnTasks = (tasksByStatus.get(statusId) ?? []).filter((t) => t.id !== draggedId);
    const index = Math.min(dropTarget.index, columnTasks.length);
    const before = columnTasks[index - 1]?.order;
    const after = columnTasks[index]?.order;
    const order = computeOrderBetween(before, after);
    if (dragged.status !== statusId || dragged.order !== order) {
      onUpdate(draggedId, { status: statusId, order });
    }
    setDraggedId(null);
    setDropTarget(null);
  }

  function handleSubmitDraft(statusId: string) {
    const title = draftTitle.trim();
    if (title) onCreate(title, { status: statusId });
    setDraftTitle("");
    setAddingStatusId(null);
  }

  return (
    <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
      {statuses.map((status) => {
        const columnTasks = tasksByStatus.get(status.id) ?? [];
        return (
          <div
            key={status.id}
            className="flex min-w-60 flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
            onDragOver={(event) => {
              if (!draggedId) return;
              event.preventDefault();
              if (columnTasks.length === 0) setDropTarget({ statusId: status.id, index: 0 });
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(status.id);
            }}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{status.label}</span>
              <span className="text-xs font-medium text-slate-400">{columnTasks.length}</span>
              {permissions.canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setAddingStatusId(status.id);
                    setDraftTitle("");
                  }}
                  className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  aria-label={`Add task to ${status.label}`}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2.5">
              {addingStatusId === status.id && (
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onBlur={() => handleSubmitDraft(status.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSubmitDraft(status.id);
                    if (event.key === "Escape") {
                      setAddingStatusId(null);
                      setDraftTitle("");
                    }
                  }}
                  placeholder="Task title"
                  className="rounded-lg border border-indigo-300 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:border-indigo-700 dark:bg-slate-900 dark:text-slate-100"
                />
              )}

              {columnTasks.map((task, index) => (
                <div key={task.id}>
                  {dropTarget?.statusId === status.id && dropTarget.index === index && <div className="mb-2 h-1 rounded-full bg-indigo-400" />}
                  <BoardCard
                    task={task}
                    parentTitle={task.parentId ? (titleById.get(task.parentId) ?? null) : null}
                    assignees={assignees}
                    priorities={priorities}
                    attachmentCount={attachmentCounts[task.id] ?? 0}
                    permissions={permissions}
                    dragEnabled={dragEnabled}
                    dragging={draggedId === task.id}
                    onUpdate={onUpdate}
                    onRequestDelete={onRequestDelete}
                    onOpenDetail={onOpenDetail}
                    onDragStart={(event) => {
                      setDraggedId(task.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTarget(null);
                    }}
                    onDragOverCard={(event: DragEvent<HTMLDivElement>) => {
                      if (!draggedId || draggedId === task.id) return;
                      event.preventDefault();
                      event.stopPropagation();
                      const rect = event.currentTarget.getBoundingClientRect();
                      const before = event.clientY < rect.top + rect.height / 2;
                      setDropTarget({ statusId: status.id, index: before ? index : index + 1 });
                    }}
                  />
                </div>
              ))}

              {dropTarget?.statusId === status.id && dropTarget.index === columnTasks.length && columnTasks.length > 0 && (
                <div className="h-1 rounded-full bg-indigo-400" />
              )}

              {columnTasks.length === 0 && addingStatusId !== status.id && (
                <div className={cn("rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700")}>No tasks</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
