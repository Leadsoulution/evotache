"use client";

import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useProjects } from "@/hooks/useProjects";
import { StatTile } from "./StatTile";
import { BarChart } from "./BarChart";
import type { BarChartDatum } from "./BarChart";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { isOverdue } from "@/lib/date";
import { AlertTriangleIcon, CheckIcon, ListChecksIcon, UserPlusIcon } from "@/components/ui/icons";

export function StatisticsView() {
  const { tasks, assignees, loadState } = useTasks("task");
  const { statuses, priorities, loadState: metaLoadState } = useTaskMeta();
  const { projects } = useProjects();

  const doneStatusId = statuses[statuses.length - 1]?.id;

  const byStatus: BarChartDatum[] = useMemo(
    () => statuses.map((status) => ({ key: status.id, label: status.label, value: tasks.filter((t) => t.status === status.id).length, color: status.color })),
    [tasks, statuses]
  );

  const byPriority: BarChartDatum[] = useMemo(
    () => priorities.map((priority) => ({ key: priority.id, label: priority.label, value: tasks.filter((t) => t.priority === priority.id).length, color: priority.color })),
    [tasks, priorities]
  );

  const byAssignee: BarChartDatum[] = useMemo(() => {
    const rows = assignees.map((assignee) => ({
      key: assignee.id,
      label: assignee.name,
      value: tasks.filter((t) => t.assigneeIds.includes(assignee.id)).length,
      color: assignee.color,
    }));
    const unassigned = tasks.filter((t) => t.assigneeIds.length === 0).length;
    if (unassigned > 0) rows.push({ key: "unassigned", label: "Unassigned", value: unassigned, color: "#94a3b8" });
    return rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  }, [tasks, assignees]);

  const byProject: BarChartDatum[] = useMemo(() => {
    const rows = projects.map((project) => ({
      key: project.id,
      label: project.name,
      value: tasks.filter((t) => t.projectId === project.id).length,
      color: project.color,
    }));
    return rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  }, [tasks, projects]);

  const completedCount = tasks.filter((t) => t.status === doneStatusId).length;
  const overdueCount = tasks.filter((t) => t.status !== doneStatusId && isOverdue(t.dueDate)).length;
  const unassignedCount = tasks.filter((t) => t.assigneeIds.length === 0).length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const isLoading = loadState === "loading" || metaLoadState === "loading";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Statistics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">A breakdown of your tasks by status, priority, assignee, and project.</p>
      </header>

      {isLoading ? (
        <TaskListSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total tasks" value={tasks.length} icon={<ListChecksIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Completion rate" value={`${completionRate}%`} icon={<CheckIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Overdue" value={overdueCount} tone={overdueCount > 0 ? "critical" : "default"} icon={<AlertTriangleIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Unassigned" value={unassignedCount} icon={<UserPlusIcon className="h-4.5 w-4.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Tasks by status">
              <BarChart data={byStatus} />
            </ChartCard>
            <ChartCard title="Tasks by priority">
              <BarChart data={byPriority} />
            </ChartCard>
            <ChartCard title="Tasks by assignee">
              <BarChart data={byAssignee} />
            </ChartCard>
            {byProject.length > 0 && (
              <ChartCard title="Tasks by project">
                <BarChart data={byProject} />
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      {children}
    </div>
  );
}
