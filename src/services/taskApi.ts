import { fetchAssignees as fetchActiveUserAssignees } from "@/services/userApi";
import type { Assignee, Task, TaskDraft, TaskModule } from "@/types/task";

export class ApiError extends Error {}

export interface TaskScope {
  userId: string;
  isAdmin: boolean;
  module: TaskModule;
  visibleUserIds: string[];
}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

/** The `scope` argument's userId/isAdmin/visibleUserIds are accepted for call-site compatibility but the server independently re-derives the real scope from the authenticated session — only `module` is actually read client-side to build the query. */
export async function fetchTasks(scope: TaskScope): Promise<Task[]> {
  const response = await fetch(`/api/tasks?module=${scope.module}`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchAssignees(): Promise<Assignee[]> {
  return fetchActiveUserAssignees();
}

/** `continuesTaskId` marks this draft as the next occurrence of that existing recurring task, so the server assigns it the same owner as the series instead of whoever's session happened to spawn it. */
export async function createTaskRequest(draft: TaskDraft, continuesTaskId?: string): Promise<Task> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(continuesTaskId ? { ...draft, continuesTaskId } : draft),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateTaskRequest(id: string, patch: Partial<Task>): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteTasksRequest(ids: string[]): Promise<void> {
  const response = await fetch("/api/tasks/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  // Attachment cleanup (rows + Storage files) now happens server-side in
  // /api/tasks/bulk-delete, since Attachment is a real table, not localStorage.
}
