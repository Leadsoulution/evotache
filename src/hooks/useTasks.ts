"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTaskRequest, deleteTasksRequest, fetchAssignees, fetchTasks, updateTaskRequest } from "@/services/taskApi";
import { fetchDefaultPriorityId, fetchDefaultStatusId, fetchStatuses } from "@/services/taskMetaApi";
import { fetchUsers } from "@/services/userApi";
import { generateId } from "@/lib/id";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { canManageUsers } from "@/config/roleMeta";
import { getDescendantIds } from "@/lib/taskTree";
import { getVisibleUserIds } from "@/lib/orgChart";
import { computeNextOccurrence } from "@/lib/recurrence";
import { fromDateInputValue } from "@/lib/date";
import type { Assignee, Task, TaskDraft, TaskModule } from "@/types/task";
import type { StatusDef } from "@/types/taskMeta";

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

export function useTasks(module: TaskModule): UseTasksResult {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const tasksRef = useRef<Task[]>([]);
  const defaultsRef = useRef<{ statusId: string; priorityId: string }>({ statusId: "todo", priorityId: "none" });
  const statusesRef = useRef<StatusDef[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const isAdmin = user ? canManageUsers(user.role) : false;

  const load = useCallback(() => {
    if (!user) return;
    setLoadState("loading");
    setErrorMessage(null);
    Promise.all([fetchUsers(), fetchAssignees(), fetchDefaultStatusId(), fetchDefaultPriorityId(), fetchStatuses()])
      .then(([allUsers, assigneeList, statusId, priorityId, statusList]) => {
        const visibleUserIds = getVisibleUserIds(allUsers, user.id);
        return fetchTasks({ userId: user.id, isAdmin, module, visibleUserIds }).then((taskList) => {
          defaultsRef.current = { statusId, priorityId };
          statusesRef.current = statusList;
          setTasks(taskList);
          setAssignees(assigneeList);
          setLoadState("success");
        });
      })
      .catch((err: unknown) => {
        setLoadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
  }, [user, isAdmin, module]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([fetchUsers(), fetchAssignees(), fetchDefaultStatusId(), fetchDefaultPriorityId(), fetchStatuses()])
      .then(([allUsers, assigneeList, statusId, priorityId, statusList]) => {
        const visibleUserIds = getVisibleUserIds(allUsers, user.id);
        return fetchTasks({ userId: user.id, isAdmin, module, visibleUserIds }).then((taskList) => {
          if (cancelled) return;
          defaultsRef.current = { statusId, priorityId };
          statusesRef.current = statusList;
          setTasks(taskList);
          setAssignees(assigneeList);
          setLoadState("success");
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, module]);

  const createTask = useCallback(
    async (title: string, options: CreateTaskOptions = {}) => {
      const trimmed = title.trim();
      if (!trimmed || !user) return;
      const parentId = options.parentId ?? null;
      const previous = tasksRef.current;
      const id = generateId();
      const now = new Date().toISOString();
      const siblings = previous.filter((t) => t.parentId === parentId);
      const { statusId, priorityId } = defaultsRef.current;
      const optimisticTask: Task = {
        id,
        module,
        title: trimmed,
        description: options.description ?? "",
        status: options.status ?? statusId,
        priority: options.priority ?? priorityId,
        assigneeIds: isAdmin ? [] : [user.id],
        teamIds: [],
        excludedUserIds: [],
        dueDate: options.dueDate ?? null,
        recurrence: null,
        parentId,
        projectId: null,
        customValues: {},
        order: siblings.length ? Math.max(...siblings.map((t) => t.order)) + 1 : 0,
        createdAt: now,
        updatedAt: now,
      };
      setTasks([...previous, optimisticTask]);
      try {
        const draft: TaskDraft = { ...optimisticTask };
        const created = await createTaskRequest(draft);
        setTasks((current) => current.map((t) => (t.id === id ? created : t)));
      } catch (err) {
        setTasks(previous);
        toast.error(err instanceof Error ? err.message : "Failed to create task.");
      }
    },
    [toast, user, isAdmin, module]
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
        const statuses = statusesRef.current;
        const doneId = statuses[statuses.length - 1]?.id;
        const firstId = statuses[0]?.id;
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

      setTasks(previous.map((t) => (t.id === id ? { ...t, ...finalPatch, updatedAt: new Date().toISOString() } : t)));
      try {
        const updated = await updateTaskRequest(id, finalPatch);
        setTasks((current) => current.map((t) => (t.id === id ? updated : t)));
      } catch (err) {
        setTasks(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update task.");
      }
    },
    [toast]
  );

  const deleteTasks = useCallback(
    async (ids: string[]) => {
      const previous = tasksRef.current;
      const descendantIds = ids.flatMap((id) => getDescendantIds(previous, id));
      const allRemoved = new Set([...ids, ...descendantIds]);
      setTasks(previous.filter((t) => !allRemoved.has(t.id)));
      try {
        await deleteTasksRequest(ids);
      } catch (err) {
        setTasks(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete task.");
      }
    },
    [toast]
  );

  const reorderTask = useCallback(
    async (id: string, order: number) => {
      await updateTask(id, { order });
    },
    [updateTask]
  );

  return { tasks, assignees, loadState, errorMessage, refetch: load, createTask, updateTask, deleteTasks, reorderTask };
}
