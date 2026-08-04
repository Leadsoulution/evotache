import type { Task, TaskFilters } from "@/types/task";
import { taskMatchesFilters } from "@/lib/taskQuery";

export interface FlatTreeRow {
  task: Task;
  depth: number;
  hasChildren: boolean;
  childCount: number;
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
      filters.teamIds.length ||
      filters.taskTypes.length ||
      filters.myTasksOnly
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
    rows.push({ task, depth, hasChildren: children.length > 0, childCount: children.length });
    if (children.length > 0 && !collapsedIds.has(task.id)) {
      for (const child of children) walk(child, depth + 1);
    }
  }

  for (const task of topLevelTasksInOrder) walk(task, 0);
  return rows;
}

/** Every visible task (top-level roots that passed the filter, plus their
 * full descendant subtree — matching filterTopLevelTasks' "no partial
 * pruning" policy) as one flat list, for grouping modes that bucket by each
 * task's own field rather than its root's. */
export function collectVisibleTasks(filteredTopLevel: Task[], allTasks: Task[]): Task[] {
  const idSet = new Set<string>();
  for (const root of filteredTopLevel) {
    idSet.add(root.id);
    for (const id of getDescendantIds(allTasks, root.id)) idSet.add(id);
  }
  return allTasks.filter((t) => idSet.has(t.id));
}

/**
 * Renders one status/priority/assignee group as a tree, but only nests a
 * task under its parent when the parent is ALSO in this same group — a
 * subtask whose own status differs from its parent's (e.g. parent "To do",
 * subtask "Done") renders at depth 0 in its own group instead of staying
 * stuck under the parent's group.
 */
export function flattenGroupTree(groupTasksInOrder: Task[], collapsedIds: Set<string>): FlatTreeRow[] {
  const idsInGroup = new Set(groupTasksInOrder.map((t) => t.id));
  const childrenMap = buildChildrenMap(groupTasksInOrder);
  const roots = groupTasksInOrder.filter((t) => !t.parentId || !idsInGroup.has(t.parentId));

  const rows: FlatTreeRow[] = [];
  function walk(task: Task, depth: number) {
    const children = childrenMap.get(task.id) ?? [];
    rows.push({ task, depth, hasChildren: children.length > 0, childCount: children.length });
    if (children.length > 0 && !collapsedIds.has(task.id)) {
      for (const child of children) walk(child, depth + 1);
    }
  }

  for (const task of roots) walk(task, 0);
  return rows;
}
