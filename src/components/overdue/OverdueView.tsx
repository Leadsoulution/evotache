"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useProjects } from "@/hooks/useProjects";
import { useTeams } from "@/hooks/useTeams";
import { useCustomFields } from "@/hooks/useCustomFields";
import { getTaskPermissions } from "@/lib/taskPermissions";
import { getChildren } from "@/lib/taskTree";
import { isOverdue } from "@/lib/date";
import { TaskDetailDrawer } from "@/components/task-list/TaskDetailDrawer";
import { StatusMenu } from "@/components/task-list/StatusMenu";
import { PriorityMenu } from "@/components/task-list/PriorityMenu";
import { AssigneeMenu } from "@/components/task-list/AssigneeMenu";
import { DueDateField } from "@/components/task-list/DueDateField";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { AlertTriangleIcon } from "@/components/ui/icons";
import type { Assignee, Task } from "@/types/task";
import type { StatusDef, PriorityDef } from "@/types/taskMeta";

const noop = () => {};

export function OverdueView() {
  const { user } = useAuth();
  const permissions = getTaskPermissions(user ?? undefined);
  const tasksHook = useTasks("task");
  const disputesHook = useTasks("dispute");
  const { statuses, priorities, loadState: metaLoadState } = useTaskMeta();
  const { projects } = useProjects();
  const { teams } = useTeams();
  const { fields: customFields } = useCustomFields();
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const doneStatusId = statuses[statuses.length - 1]?.id;

  const overdueTasks = useMemo(
    () => (doneStatusId ? tasksHook.tasks.filter((t) => t.status !== doneStatusId && isOverdue(t.dueDate)) : []),
    [tasksHook.tasks, doneStatusId]
  );
  const overdueDisputes = useMemo(
    () => (doneStatusId ? disputesHook.tasks.filter((t) => t.status !== doneStatusId && isOverdue(t.dueDate)) : []),
    [disputesHook.tasks, doneStatusId]
  );

  const isLoading = tasksHook.loadState === "loading" || disputesHook.loadState === "loading" || metaLoadState === "loading";

  const detailHook = detailTask?.module === "dispute" ? disputesHook : tasksHook;
  const openTask = detailTask ? (detailHook.tasks.find((t) => t.id === detailTask.id) ?? detailTask) : null;

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Overdue</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tasks and litiges past their due date, across everything you can see.</p>
      </header>

      {isLoading && <TaskListSkeleton />}

      {!isLoading && overdueTasks.length === 0 && overdueDisputes.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <AlertTriangleIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nothing overdue. Nice.</p>
        </div>
      )}

      {!isLoading && overdueTasks.length > 0 && (
        <OverdueSection title="Tasks" statuses={statuses} priorities={priorities} items={overdueTasks} assignees={tasksHook.assignees} onOpen={setDetailTask} />
      )}

      {!isLoading && overdueDisputes.length > 0 && (
        <OverdueSection
          title="Litiges"
          statuses={statuses}
          priorities={priorities}
          items={overdueDisputes}
          assignees={disputesHook.assignees}
          onOpen={setDetailTask}
        />
      )}

      <TaskDetailDrawer
        task={openTask}
        assignees={detailHook.assignees}
        statuses={statuses}
        priorities={priorities}
        customFields={customFields}
        projects={projects}
        teams={teams}
        subtaskCount={openTask ? getChildren(detailHook.tasks, openTask.id).length : 0}
        currentUserId={user?.id ?? ""}
        permissions={permissions}
        onClose={() => setDetailTask(null)}
        onUpdate={detailHook.updateTask}
      />
    </div>
  );
}

interface OverdueSectionProps {
  title: string;
  items: Task[];
  assignees: Assignee[];
  statuses: StatusDef[];
  priorities: PriorityDef[];
  onOpen: (task: Task) => void;
}

function OverdueSection({ title, items, assignees, statuses, priorities, onOpen }: OverdueSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title} <span className="font-normal text-slate-400">({items.length})</span>
      </h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {items.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onOpen(task)}
            className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{task.title}</span>
            <StatusMenu value={task.status} statuses={statuses} onChange={noop} readOnly />
            <PriorityMenu value={task.priority} priorities={priorities} onChange={noop} readOnly />
            <AssigneeMenu assignees={assignees} value={task.assigneeIds} onChange={noop} readOnly />
            <DueDateField value={task.dueDate} onChange={noop} readOnly />
          </button>
        ))}
      </div>
    </section>
  );
}
