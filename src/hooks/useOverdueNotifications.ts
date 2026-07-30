"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { fetchTasks } from "@/services/taskApi";
import { canManageUsers } from "@/config/roleMeta";
import { isOverdue } from "@/lib/date";
import type { Task, TaskModule } from "@/types/task";

const POLL_MS = 60_000;

export interface OverdueNotification {
  id: string;
  title: string;
  module: TaskModule;
  dueDate: string;
}

/** Overdue, not-done tasks assigned to the current user — refreshed on an
 * interval so the bell stays roughly live without a push channel. Uses the
 * same "tasks"/module SWR keys as useTasks, so this (mounted up to 3x at
 * once: desktop bell, mobile bell, overdue popup) shares its fetches with
 * whatever page-level task list is already loaded instead of tripling them. */
export function useOverdueNotifications() {
  const { user } = useAuth();
  const { statuses } = useTaskMeta();
  const isAdmin = user ? canManageUsers(user.role) : false;

  const tasksSWR = useSWR<Task[]>(
    user ? ["tasks", "task"] : null,
    () => fetchTasks({ userId: user!.id, isAdmin, module: "task", visibleUserIds: [] }),
    { refreshInterval: POLL_MS }
  );
  const disputesSWR = useSWR<Task[]>(
    user ? ["tasks", "dispute"] : null,
    () => fetchTasks({ userId: user!.id, isAdmin, module: "dispute", visibleUserIds: [] }),
    { refreshInterval: POLL_MS }
  );

  const doneStatusId = statuses[statuses.length - 1]?.id;

  const overdue = useMemo<OverdueNotification[]>(() => {
    if (!user || !doneStatusId) return [];
    const tasks = [...(tasksSWR.data ?? []), ...(disputesSWR.data ?? [])];
    return tasks
      .filter((t) => t.assigneeIds.includes(user.id) && t.status !== doneStatusId && isOverdue(t.dueDate))
      .map((t) => ({ id: t.id, title: t.title, module: t.module, dueDate: t.dueDate as string }))
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  }, [tasksSWR.data, disputesSWR.data, user, doneStatusId]);

  return { overdue, count: overdue.length };
}
