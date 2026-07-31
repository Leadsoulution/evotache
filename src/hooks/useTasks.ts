"use client";

import { useCallback, useRef, useEffect, useMemo } from "react";
import useSWR from "swr";
import { createTaskRequest, deleteTasksRequest, fetchTasks, updateTaskRequest } from "@/services/taskApi";
import { fetchStatuses, fetchPriorities } from "@/services/taskMetaApi";
import { fetchUsers } from "@/services/userApi";
import { generateId } from "@/lib/id";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { canManageUsers } from "@/config/roleMeta";
import { getDescendantIds } from "@/lib/taskTree";
import { computeNextOccurrence } from "@/lib/recurrence";
import { fromDateInputValue } from "@/lib/date";
import type { Assignee, Task, TaskDraft, TaskModule } from "@/types/task";
import type { AppUser } from "@/types/user";
import type { StatusDef, PriorityDef } from "@/types/taskMeta";

type LoadState = "loading" | "success" | "error";

export interface CreateTaskOptions {
  parentId?: string | null;
  status?: string;
  priority?: string;
  description?: string;
  dueDate?: string | null;
}

interface UseTasksResult {
  tasks: Task[];
  assignees: Assignee[];
  loadState: LoadState;
  errorMessage: string | null;
  refetch: () => void;
  createTask: (title: string, options?: CreateTaskOptions) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTasks: (ids: string[]) => Promise<void>;
  reorderTask: (id: string, order: number) => Promise<void>;
}

function taskKey(module: TaskModule) {
  return ["tasks", module] as const;
}

export function useTasks(module: TaskModule): UseTasksResult {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user ? canManageUsers(user.role) : false;
  const statusesRef = useRef<StatusDef[]>([]);

  // Shared cache keys — reused verbatim by useUsers/useTaskMeta, so mounting
  // both a task list and, say, the badge-count hook on the same page fetches
  // each of these exactly once instead of once per hook instance.
  const usersSWR = useSWR<AppUser[]>(user ? "users" : null, fetchUsers);
  const statusesSWR = useSWR<StatusDef[]>(user ? "statuses" : null, fetchStatuses);
  const prioritiesSWR = useSWR<PriorityDef[]>(user ? "priorities" : null, fetchPriorities);
  const tasksSWR = useSWR<Task[]>(user ? taskKey(module) : null, () => fetchTasks({ userId: user!.id, isAdmin, module, visibleUserIds: [] }));

  const tasks = useMemo(() => tasksSWR.data ?? [], [tasksSWR.data]);
  const statuses = useMemo(() => statusesSWR.data ?? [], [statusesSWR.data]);
  const priorities = useMemo(() => prioritiesSWR.data ?? [], [prioritiesSWR.data]);
  const assignees: Assignee[] = useMemo(
    () =>
      (usersSWR.data ?? [])
        .filter((u) => u.status === "active" && !u.isAgent)
        .map((u) => ({ id: u.id, name: u.name, color: u.color, photoDataUrl: u.photoDataUrl })),
    [usersSWR.data]
  );
  const defaultStatusId = statuses[0]?.id ?? "todo";
  const defaultPriorityId = priorities[priorities.length - 1]?.id ?? "none";

  const anyLoading = usersSWR.isLoading || statusesSWR.isLoading || prioritiesSWR.isLoading || tasksSWR.isLoading;
  const anyError = usersSWR.error || statusesSWR.error || prioritiesSWR.error || tasksSWR.error;
  const loadState: LoadState = anyError ? "error" : anyLoading ? "loading" : "success";
  const errorMessage = anyError ? (anyError instanceof Error ? anyError.message : "Something went wrong.") : null;

  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  const refetch = useCallback(() => {
    void tasksSWR.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  const createTask = useCallback(
    async (title: string, options: CreateTaskOptions = {}) => {
      const trimmed = title.trim();
      if (!trimmed || !user) return;
      const parentId = options.parentId ?? null;
      const previous = tasksRef.current;
      const id = generateId();
      const now = new Date().toISOString();
      const siblings = previous.filter((t) => t.parentId === parentId);
      const optimisticTask: Task = {
        id,
        module,
        title: trimmed,
        description: options.description ?? "",
        status: options.status ?? defaultStatusId,
        priority: options.priority ?? defaultPriorityId,
        assigneeIds: isAdmin ? [] : [user.id],
        teamIds: [],
        excludedUserIds: [],
        startDate: null,
        dueDate: options.dueDate ?? null,
        recurrence: null,
        parentId,
        projectId: null,
        customValues: {},
        order: siblings.length ? Math.max(...siblings.map((t) => t.order)) + 1 : 0,
        createdAt: now,
        updatedAt: now,
      };
      await tasksSWR.mutate([...previous, optimisticTask], { revalidate: false });
      try {
        const draft: TaskDraft = { ...optimisticTask };
        const created = await createTaskRequest(draft);
        await tasksSWR.mutate((current) => (current ?? previous).map((t) => (t.id === id ? created : t)), { revalidate: false });
      } catch (err) {
        await tasksSWR.mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to create task.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast, user, isAdmin, module, defaultStatusId, defaultPriorityId]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      const previous = tasksRef.current;
      const existingTask = previous.find((t) => t.id === id);
      let finalPatch = patch;

      // Recurring tasks don't stay "done" — moving one to the workflow's last
      // status recycles it: jump the due date to the next occurrence and reset
      // status back to the first column, instead of leaving it completed.
      if (existingTask?.recurrence && patch.status && patch.status !== existingTask.status) {
        const currentStatuses = statusesRef.current;
        const doneId = currentStatuses[currentStatuses.length - 1]?.id;
        const firstId = currentStatuses[0]?.id;
        if (doneId && firstId && patch.status === doneId) {
          const base = existingTask.dueDate ? new Date(existingTask.dueDate) : new Date();
          const next = computeNextOccurrence(existingTask.recurrence, base);
          const y = next.getFullYear();
          const m = String(next.getMonth() + 1).padStart(2, "0");
          const d = String(next.getDate()).padStart(2, "0");
          finalPatch = { ...patch, status: firstId, dueDate: fromDateInputValue(`${y}-${m}-${d}`) };
          toast.success(`Recurring task rescheduled — next due ${next.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`);
        }
      }

      // A task moved (back) to the workflow's first status ("To Do") jumps to
      // the front of the manual order, so it's easy to spot right after the change.
      const firstStatusId = statusesRef.current[0]?.id;
      if (firstStatusId && finalPatch.status === firstStatusId && existingTask && existingTask.status !== firstStatusId) {
        const minOrder = previous.length ? Math.min(...previous.map((t) => t.order)) : 0;
        finalPatch = { ...finalPatch, order: minOrder - 1 };
      }

      await tasksSWR.mutate(
        previous.map((t) => (t.id === id ? { ...t, ...finalPatch, updatedAt: new Date().toISOString() } : t)),
        { revalidate: false }
      );
      try {
        const updated = await updateTaskRequest(id, finalPatch);
        await tasksSWR.mutate((current) => (current ?? previous).map((t) => (t.id === id ? updated : t)), { revalidate: false });
      } catch (err) {
        await tasksSWR.mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update task.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast]
  );

  const deleteTasks = useCallback(
    async (ids: string[]) => {
      const previous = tasksRef.current;
      const descendantIds = ids.flatMap((id) => getDescendantIds(previous, id));
      const allRemoved = new Set([...ids, ...descendantIds]);
      await tasksSWR.mutate(previous.filter((t) => !allRemoved.has(t.id)), { revalidate: false });
      try {
        await deleteTasksRequest(ids);
      } catch (err) {
        await tasksSWR.mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete task.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast]
  );

  const reorderTask = useCallback(
    async (id: string, order: number) => {
      await updateTask(id, { order });
    },
    [updateTask]
  );

  return { tasks, assignees, loadState, errorMessage, refetch, createTask, updateTask, deleteTasks, reorderTask };
}
