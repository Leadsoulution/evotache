import Link from "next/link";
import { AssigneeMenu } from "@/components/task-list/AssigneeMenu";
import { DueDateField } from "@/components/task-list/DueDateField";
import type { Assignee, Task } from "@/types/task";

interface TaskMiniListProps {
  tasks: Task[];
  assignees: Assignee[];
  emptyLabel: string;
  limit?: number;
}

const noop = () => {};

export function TaskMiniList({ tasks, assignees, emptyLabel, limit = 6 }: TaskMiniListProps) {
  if (tasks.length === 0) return <p className="px-1 py-2 text-sm text-slate-400">{emptyLabel}</p>;

  const visible = tasks.slice(0, limit);

  return (
    <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
      {visible.map((task) => (
        <li key={task.id} className="flex items-center gap-2 py-2">
          <Link href="/tasks" className="min-w-0 flex-1 truncate text-sm text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400">
            {task.title}
          </Link>
          <AssigneeMenu assignees={assignees} value={task.assigneeIds} onChange={noop} readOnly />
          <DueDateField value={task.dueDate} onChange={noop} readOnly />
        </li>
      ))}
      {tasks.length > limit && <li className="pt-2 text-xs text-slate-400">+{tasks.length - limit} more</li>}
    </ul>
  );
}
