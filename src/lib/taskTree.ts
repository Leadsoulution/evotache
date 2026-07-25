import type { Task, TaskFilters } from "@/types/task";
import { taskMatchesFilters } from "@/lib/taskQuery";

export interface FlatTreeRow {
  task: Task;
  depth: number;
  hasChildren: boolean;
}

function buildChildrenMap(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.parentId) continue;
    const list = map.get(task.parentId) ?? [];
    list.push(task);
    map.set(task.parentId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.order - b.order);
  return map;
}

export function getChildren(tasks: Task[], parentId: string): Task[] {
  return tasks.filter((t) => t.parentId === parentId).sort((a, b) => a.order - b.order);
}

export function getDescendantIds(tasks: Task[], rootId: string): string[] {
  const childrenMap = buildChildrenMap(tasks);
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const currentId = stack.pop() as string;
    const children = childrenMap.get(currentId) ?? [];
    for (const child of children) {
      result.push(child.id);
      stack.push(child.id);
    }
  }
  return result;
}

export function countDescendants(tasks: Task[], rootId: string): number {
  return getDescendantIds(tasks, rootId).length;
}

function subtreeMatches(task: Task, childrenMap: Map<string, Task[]>, filters: TaskFilters, assigneeNameById: Record<string, string>): boolean {
  if (taskMatchesFilters(task, filters, assigneeNameById)) return true;
  const children = childrenMap.get(task.id) ?? [];
  return children.some((child) => subtreeMatches(child, childrenMap, filters, assigneeNameById));
}

/**
 * A top-level task is visible if it (or any of its descendants) matches the filters.
 * Once a top-level task is visible, its whole subtree is shown (no partial pruning),
 * so subtask context stays attached to its parent.
 */
export function filterTopLevelTasks(topLevelTasks: Task[], allTasks: Task[], filters: TaskFilters, assigneeNameById: Record<string, string>): Task[] {
  const hasActiveFilter = Boolean(
    filters.search ||
      filters.statuses.length ||
      filters.priorities.length ||
      filters.assigneeIds.length ||
      filters.projectIds.length ||
      filters.teamIds.length
  );
  if (!hasActiveFilter) return topLevelTasks;
  const childrenMap = buildChildrenMap(allTasks);
  return topLevelTasks.filter((task) => subtreeMatches(task, childrenMap, filters, assigneeNameById));
}

export function flattenVisibleTree(topLevelTasksInOrder: Task[], allTasks: Task[], collapsedIds: Set<string>): FlatTreeRow[] {
  const childrenMap = buildChildrenMap(allTasks);
  const rows: FlatTreeRow[] = [];

  function walk(task: Task, depth: number) {
    const children = childrenMap.get(task.id) ?? [];
    rows.push({ task, depth, hasChildren: children.length > 0 });
    if (children.length > 0 && !collapsedIds.has(task.id)) {
      for (const child of children) walk(child, depth + 1);
    }
  }

  for (const task of topLevelTasksInOrder) walk(task, 0);
  return rows;
}
