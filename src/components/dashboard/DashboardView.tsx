"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useProjects } from "@/hooks/useProjects";
import { useTeams } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { UserSelectorBar } from "@/components/filters/UserSelectorBar";
import { StatTile } from "@/components/stats/StatTile";
import { ChartCard } from "@/components/stats/ChartCard";
import { BarChart } from "@/components/stats/BarChart";
import { TaskMiniList } from "./TaskMiniList";
import { RecentActivityList } from "./RecentActivityList";
import { applyGlobalFilters } from "@/lib/globalFilters";
import { countByAssignee } from "@/lib/taskStats";
import { isDueSoon, isDueToday, isOverdue, isToday } from "@/lib/date";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckIcon,
  ChartBarIcon,
  FolderIcon,
  ListChecksIcon,
  ScaleIcon,
  SparklesIcon,
} from "@/components/ui/icons";

const QUICK_LINKS = [
  { href: "/tasks", label: "Tasks", description: "Your task list, subtasks, and attachments.", icon: ListChecksIcon },
  { href: "/projects", label: "Projects", description: "Group tasks under projects.", icon: FolderIcon },
  { href: "/disputes", label: "Litiges", description: "Track disputes and claims.", icon: ScaleIcon },
  { href: "/statistics", label: "Statistics", description: "Charts across statuses, priorities, and people.", icon: ChartBarIcon },
  { href: "/assistant", label: "AI Assistant", description: "Generate tasks from a prompt.", icon: SparklesIcon },
];

export function DashboardView() {
  const { user } = useAuth();
  const { tasks: allTasks, assignees, loadState: tasksLoadState } = useTasks("task");
  const { tasks: allDisputes, loadState: disputesLoadState } = useTasks("dispute");
  const { statuses, priorities } = useTaskMeta();
  const { projects } = useProjects();
  const { teams } = useTeams();
  const { users } = useUsers();
  const { filters, setTeamIds, setUserIds, setProjectIds, setPriorities, setStatuses, setDateRange, selectUser, clearAll } = useGlobalFilters();

  const tasks = useMemo(() => applyGlobalFilters(allTasks, filters), [allTasks, filters]);
  const disputes = useMemo(() => applyGlobalFilters(allDisputes, filters), [allDisputes, filters]);

  const doneStatusId = statuses[statuses.length - 1]?.id;

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== doneStatusId), [tasks, doneStatusId]);
  const overdueTasks = useMemo(() => openTasks.filter((t) => isOverdue(t.dueDate)), [openTasks]);
  const dueTodayTasks = useMemo(() => openTasks.filter((t) => isDueToday(t.dueDate)), [openTasks]);
  const dueSoonCount = useMemo(() => openTasks.filter((t) => isDueSoon(t.dueDate)).length, [openTasks]);
  const upcomingTasks = useMemo(() => openTasks.filter((t) => isDueSoon(t.dueDate) && !isDueToday(t.dueDate)), [openTasks]);
  const completedTodayCount = useMemo(
    () => tasks.filter((t) => t.status === doneStatusId && isToday(t.updatedAt)).length,
    [tasks, doneStatusId]
  );
  const openDisputeCount = useMemo(() => disputes.filter((d) => d.status !== doneStatusId).length, [disputes, doneStatusId]);
  const workload = useMemo(() => countByAssignee(openTasks, assignees), [openTasks, assignees]);

  const isLoading = tasksLoadState === "loading" || disputesLoadState === "loading";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your daily follow-up: what&apos;s due, what&apos;s late, and who&apos;s carrying what.</p>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-[76px] animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label="Open tasks" value={openTasks.length} icon={<ListChecksIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Overdue" value={overdueTasks.length} tone={overdueTasks.length > 0 ? "critical" : "default"} icon={<AlertTriangleIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Due within 2 days" value={dueSoonCount} tone={dueSoonCount > 0 ? "warning" : "default"} icon={<CalendarIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Completed today" value={completedTodayCount} icon={<CheckIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Open litiges" value={openDisputeCount} icon={<ScaleIcon className="h-4.5 w-4.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Overdue">
              <TaskMiniList tasks={overdueTasks} assignees={assignees} emptyLabel="Nothing overdue. Nice." />
            </ChartCard>
            <ChartCard title="Due today">
              <TaskMiniList tasks={dueTodayTasks} assignees={assignees} emptyLabel="Nothing due today." />
            </ChartCard>
            <ChartCard title="Upcoming (next 2 days)">
              <TaskMiniList tasks={upcomingTasks} assignees={assignees} emptyLabel="Nothing coming up." />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Workload (open tasks per person)">
              <BarChart data={workload} />
            </ChartCard>
            <ChartCard title="Recent activity" action={{ href: "/tasks", label: "View all" }}>
              <RecentActivityList tasks={tasks} statuses={statuses} />
            </ChartCard>
          </div>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Jump back in</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{link.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{link.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
