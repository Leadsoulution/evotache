import { isOverdue } from "@/lib/date";
import type { Assignee, Task } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";
import type { Project } from "@/types/project";
import type { Team } from "@/types/team";
import type { BarChartDatum } from "@/components/stats/BarChart";

export function countByStatus(tasks: Task[], statuses: StatusDef[]): BarChartDatum[] {
  return statuses.map((status) => ({ key: status.id, label: status.label, value: tasks.filter((t) => t.status === status.id).length, color: status.color }));
}

export function countByPriority(tasks: Task[], priorities: PriorityDef[]): BarChartDatum[] {
  return priorities.map((priority) => ({
    key: priority.id,
    label: priority.label,
    value: tasks.filter((t) => t.priority === priority.id).length,
    color: priority.color,
  }));
}

export function countByAssignee(tasks: Task[], assignees: Assignee[]): BarChartDatum[] {
  const rows = assignees.map((assignee) => ({
    key: assignee.id,
    label: assignee.name,
    value: tasks.filter((t) => t.assigneeIds.includes(assignee.id)).length,
    color: assignee.color,
  }));
  const unassigned = tasks.filter((t) => t.assigneeIds.length === 0).length;
  if (unassigned > 0) rows.push({ key: "unassigned", label: "Unassigned", value: unassigned, color: "#94a3b8" });
  return rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
}

export function countByProject(tasks: Task[], projects: Project[]): BarChartDatum[] {
  const rows = projects.map((project) => ({
    key: project.id,
    label: project.name,
    value: tasks.filter((t) => t.projectId === project.id).length,
    color: project.color,
  }));
  return rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
}

export function countByTeam(tasks: Task[], teams: Team[]): BarChartDatum[] {
  const rows = teams.map((team) => ({
    key: team.id,
    label: team.name,
    value: tasks.filter((t) => (t.teamIds ?? []).includes(team.id)).length,
    color: team.color,
  }));
  return rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
}

export function countCompletedByWeek(tasks: Task[], doneStatusId: string | undefined, weeks = 6): BarChartDatum[] {
  if (!doneStatusId) return [];
  const now = new Date();
  const buckets: BarChartDatum[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const value = tasks.filter((t) => {
      if (t.status !== doneStatusId) return false;
      const updated = new Date(t.updatedAt).getTime();
      return updated >= start.getTime() && updated <= end.getTime();
    }).length;
    buckets.push({ key: `week-${i}`, label: i === 0 ? "This week" : `${i}w ago`, value, color: "#6366f1" });
  }
  return buckets;
}

export interface PerformanceRow {
  key: string;
  label: string;
  color: string;
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

function buildPerformanceRow(key: string, label: string, color: string, rowTasks: Task[], doneStatusId: string | undefined): PerformanceRow {
  const total = rowTasks.length;
  const completed = doneStatusId ? rowTasks.filter((t) => t.status === doneStatusId).length : 0;
  const overdue = rowTasks.filter((t) => t.status !== doneStatusId && isOverdue(t.dueDate)).length;
  return { key, label, color, total, completed, overdue, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export function performanceByUser(tasks: Task[], assignees: Assignee[], doneStatusId: string | undefined): PerformanceRow[] {
  return assignees
    .map((a) => buildPerformanceRow(a.id, a.name, a.color, tasks.filter((t) => t.assigneeIds.includes(a.id)), doneStatusId))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function performanceByTeam(tasks: Task[], teams: Team[], doneStatusId: string | undefined): PerformanceRow[] {
  return teams
    .map((t) => buildPerformanceRow(t.id, t.name, t.color, tasks.filter((task) => (task.teamIds ?? []).includes(t.id)), doneStatusId))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function performanceByProject(tasks: Task[], projects: Project[], doneStatusId: string | undefined): PerformanceRow[] {
  return projects
    .map((p) => buildPerformanceRow(p.id, p.name, p.color, tasks.filter((t) => t.projectId === p.id), doneStatusId))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * "On time" compares a completed task's completion moment (updatedAt, the
 * closest proxy available — there's no separate completedAt timestamp) to
 * its own due date, not to today's date. isOverdue() answers a different
 * question (is this still-open task late right now) and would wrongly mark
 * every completed task with a past due date as late.
 */
export function computeOnTimeRate(tasks: Task[], doneStatusId: string | undefined): number {
  if (!doneStatusId) return 0;
  const completed = tasks.filter((t) => t.status === doneStatusId);
  if (completed.length === 0) return 0;
  const onTime = completed.filter((t) => !t.dueDate || new Date(t.updatedAt).getTime() <= new Date(t.dueDate).getTime());
  return Math.round((onTime.length / completed.length) * 100);
}
