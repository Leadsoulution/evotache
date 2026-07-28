import { createSeedDisputes, createSeedTasks } from "@/lib/seedTasks";
import { generateId } from "@/lib/id";
import { fetchAssignees as fetchActiveUserAssignees } from "@/services/userApi";
import { deleteAttachmentsForTask } from "@/services/attachmentApi";
import type { Assignee, Task, TaskDraft, TaskModule } from "@/types/task";

const STORAGE_KEY = "evotasks.tasks.v1";
const NETWORK_DELAY_MS = 350;
const SIMULATED_FAILURE_RATE = 0.08;

export class ApiError extends Error {}

export interface TaskScope {
  userId: string;
  isAdmin: boolean;
  module: TaskModule;
  visibleUserIds: string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeFail(action: string): void {
  if (Math.random() < SIMULATED_FAILURE_RATE) {
    throw new ApiError(`Failed to ${action}. The server could not be reached, please try again.`);
  }
}

function createSeedRecords(): Task[] {
  return [...createSeedTasks(), ...createSeedDisputes()];
}

function readStore(): Task[] {
  if (typeof window === "undefined") return createSeedRecords();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedRecords();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Task[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedRecords();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getDescendantIds(tasks: Task[], rootId: string): string[] {
  const childrenByParent = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.parentId) continue;
    const list = childrenByParent.get(task.parentId) ?? [];
    list.push(task);
    childrenByParent.set(task.parentId, list);
  }
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const currentId = stack.pop() as string;
    const children = childrenByParent.get(currentId) ?? [];
    for (const child of children) {
      result.push(child.id);
      stack.push(child.id);
    }
  }
  return result;
}

export async function fetchTasks(scope: TaskScope): Promise<Task[]> {
  await delay(NETWORK_DELAY_MS);
  const tasks = readStore().filter((t) => t.module === scope.module);
  if (scope.isAdmin) return tasks;
  // Visible to the assignee themselves and to their manager(s) (recursively,
  // via visibleUserIds). Team membership alone no longer grants visibility —
  // being on the same team as an assignee isn't enough to see their tasks.
  // An explicit exclusion always wins, even for a manager who'd otherwise see it.
  return tasks.filter(
    (t) => t.assigneeIds.some((id) => scope.visibleUserIds.includes(id)) && !(t.excludedUserIds ?? []).includes(scope.userId)
  );
}

export async function fetchAssignees(): Promise<Assignee[]> {
  return fetchActiveUserAssignees();
}

export async function createTaskRequest(draft: TaskDraft): Promise<Task> {
  await delay(NETWORK_DELAY_MS);
  maybeFail("create task");
  const tasks = readStore();
  const now = new Date().toISOString();
  const task: Task = {
    id: draft.id ?? generateId(),
    module: draft.module ?? "task",
    title: draft.title.trim(),
    description: draft.description ?? "",
    status: draft.status ?? "todo",
    priority: draft.priority ?? "none",
    assigneeIds: draft.assigneeIds ?? [],
    teamIds: draft.teamIds ?? [],
    excludedUserIds: draft.excludedUserIds ?? [],
    dueDate: draft.dueDate ?? null,
    recurrence: draft.recurrence ?? null,
    parentId: draft.parentId ?? null,
    projectId: draft.projectId ?? null,
    customValues: draft.customValues ?? {},
    order: draft.order ?? (tasks.length ? Math.max(...tasks.map((t) => t.order)) + 1 : 0),
    createdAt: now,
    updatedAt: now,
  };
  writeStore([...tasks, task]);
  return task;
}

export async function updateTaskRequest(id: string, patch: Partial<Task>): Promise<Task> {
  await delay(NETWORK_DELAY_MS);
  maybeFail("update task");
  const tasks = readStore();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) throw new ApiError("Task not found.");
  const updated: Task = { ...tasks[index], ...patch, id, updatedAt: new Date().toISOString() };
  const next = [...tasks];
  next[index] = updated;
  writeStore(next);
  return updated;
}

export async function deleteTasksRequest(ids: string[]): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  maybeFail("delete task");
  const tasks = readStore();
  const allIdsToDelete = new Set(ids);
  for (const id of ids) {
    for (const descendantId of getDescendantIds(tasks, id)) allIdsToDelete.add(descendantId);
  }
  writeStore(tasks.filter((t) => !allIdsToDelete.has(t.id)));
  await Promise.all(Array.from(allIdsToDelete).map((id) => deleteAttachmentsForTask(id)));
}

export function countDescendantsInStore(id: string): number {
  return getDescendantIds(readStore(), id).length;
}

export function isStatusInUse(statusId: string): boolean {
  return readStore().some((t) => t.status === statusId);
}

export function isPriorityInUse(priorityId: string): boolean {
  return readStore().some((t) => t.priority === priorityId);
}
