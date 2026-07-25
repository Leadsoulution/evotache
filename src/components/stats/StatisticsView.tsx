"use client";

import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useProjects } from "@/hooks/useProjects";
import { useTeams } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { UserSelectorBar } from "@/components/filters/UserSelectorBar";
import { StatTile } from "./StatTile";
import { BarChart } from "./BarChart";
import { ChartCard } from "./ChartCard";
import { PerformanceTable } from "./PerformanceTable";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { isOverdue } from "@/lib/date";
import { applyGlobalFilters } from "@/lib/globalFilters";
import {
  computeOnTimeRate,
  countByAssignee,
  countByPriority,
  countByProject,
  countByStatus,
  countByTeam,
  countCompletedByWeek,
  performanceByProject,
  performanceByTeam,
  performanceByUser,
} from "@/lib/taskStats";
import { AlertTriangleIcon, CheckIcon, ClockIcon, ListChecksIcon, UserPlusIcon } from "@/components/ui/icons";

export function StatisticsView() {
  const { tasks: allTasks, assignees, loadState } = useTasks("task");
  const { statuses, priorities, loadState: metaLoadState } = useTaskMeta();
  const { projects } = useProjects();
  const { teams } = useTeams();
  const { users } = useUsers();
  const { filters, setTeamIds, setUserIds, setProjectIds, setPriorities, setStatuses, setDateRange, selectUser, clearAll } = useGlobalFilters();

  const tasks = useMemo(() => applyGlobalFilters(allTasks, filters), [allTasks, filters]);

  const doneStatusId = statuses[statuses.length - 1]?.id;

  const byStatus = useMemo(() => countByStatus(tasks, statuses), [tasks, statuses]);
  const byPriority = useMemo(() => countByPriority(tasks, priorities), [tasks, priorities]);
  const byAssignee = useMemo(() => countByAssignee(tasks, assignees), [tasks, assignees]);
  const byProject = useMemo(() => countByProject(tasks, projects), [tasks, projects]);
  const byTeam = useMemo(() => countByTeam(tasks, teams), [tasks, teams]);
  const weeklyTrend = useMemo(() => countCompletedByWeek(tasks, doneStatusId), [tasks, doneStatusId]);

  const userPerformance = useMemo(() => performanceByUser(tasks, assignees, doneStatusId), [tasks, assignees, doneStatusId]);
  const teamPerformance = useMemo(() => performanceByTeam(tasks, teams, doneStatusId), [tasks, teams, doneStatusId]);
  const projectPerformance = useMemo(() => performanceByProject(tasks, projects, doneStatusId), [tasks, projects, doneStatusId]);

  const completedCount = tasks.filter((t) => t.status === doneStatusId).length;
  const overdueCount = tasks.filter((t) => t.status !== doneStatusId && isOverdue(t.dueDate)).length;
  const unassignedCount = tasks.filter((t) => t.assigneeIds.length === 0).length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const onTimeRate = useMemo(() => computeOnTimeRate(tasks, doneStatusId), [tasks, doneStatusId]);

  const isLoading = loadState === "loading" || metaLoadState === "loading";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Statistics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Analysis, trends, and performance across your work.</p>
      </header>

      <UserSelectorBar users={users} selectedUserId={filters.userIds[0] ?? null} onSelectUser={selectUser} />

      <GlobalFilterBar
        filters={filters}
        onTeamIdsChange={setTeamIds}
        onUserIdsChange={setUserIds}
        onProjectIdsChange={setProjectIds}
        onPrioritiesChange={setPriorities}
        onStatusesChange={setStatuses}
        onDateRangeChange={setDateRange}
        onClearAll={clearAll}
        teams={teams}
        users={users}
        projects={projects}
        statuses={statuses}
        priorities={priorities}
      />

      {isLoading ? (
        <TaskListSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label="Total tasks" value={tasks.length} icon={<ListChecksIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Completion rate" value={`${completionRate}%`} icon={<CheckIcon className="h-4.5 w-4.5" />} />
            <StatTile label="On-time rate" value={`${onTimeRate}%`} icon={<ClockIcon className="h-4.5 w-4.5" />} />
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
            {byTeam.length > 0 && (
              <ChartCard title="Tasks by team">
                <BarChart data={byTeam} />
              </ChartCard>
            )}
            <ChartCard title="Completed per week (last 6 weeks)">
              <BarChart data={weeklyTrend} />
            </ChartCard>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Performance</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <PerformanceTable title="By user" rows={userPerformance} />
              {teamPerformance.length > 0 && <PerformanceTable title="By team" rows={teamPerformance} />}
              {projectPerformance.length > 0 && <PerformanceTable title="By project" rows={projectPerformance} />}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
