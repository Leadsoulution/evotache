"use client";

import { useTaskMeta } from "@/hooks/useTaskMeta";
import { EditableOptionList } from "./EditableOptionList";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";

export function WorkflowManager() {
  const { statuses, priorities, loadState, addStatus, editStatus, removeStatus, moveStatus, addPriority, editPriority, removePriority, movePriority } =
    useTaskMeta();

  if (loadState === "loading") return <TaskListSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Statuses</h2>
          <p className="text-sm text-slate-400">The workflow stages tasks move through. Order here sets the board order and the default for new tasks.</p>
        </div>
        <EditableOptionList
          items={statuses}
          onAdd={addStatus}
          onEdit={editStatus}
          onRemove={removeStatus}
          onMove={moveStatus}
          addPlaceholder="Add a status..."
        />
      </section>

      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Priorities</h2>
          <p className="text-sm text-slate-400">The last priority in the list is used as the default for new tasks.</p>
        </div>
        <EditableOptionList
          items={priorities}
          onAdd={addPriority}
          onEdit={editPriority}
          onRemove={removePriority}
          onMove={movePriority}
          addPlaceholder="Add a priority..."
        />
      </section>
    </div>
  );
}
