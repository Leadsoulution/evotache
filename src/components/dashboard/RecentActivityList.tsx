import Link from "next/link";
import { StatusMenu } from "@/components/task-list/StatusMenu";
import { formatRelativeTime } from "@/lib/date";
import type { Task } from "@/types/task";
import type { StatusDef } from "@/types/taskMeta";

interface RecentActivityListProps {
  tasks: Task[];
  statuses: StatusDef[];
  limit?: number;
}

const noop = () => {};

export function RecentActivityList({ tasks, statuses, limit = 6 }: RecentActivityListProps) {
  const sorted = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);

  if (sorted.length === 0) return <p className="px-1 py-2 text-sm text-slate-400">No recent activity.</p>;

  return (
    <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
      {sorted.map((task) => (
        <li key={task.id} className="flex items-center gap-2 py-2">
          <Link href="/tasks" className="min-w-0 flex-1 truncate text-sm text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400">
            {task.title}
          </Link>
          <StatusMenu value={task.status} statuses={statuses} onChange={noop} readOnly />
          <span className="w-14 shrink-0 text-right text-xs text-slate-400">{formatRelativeTime(task.updatedAt)}</span>
        </li>
      ))}
    </ul>
  );
}
