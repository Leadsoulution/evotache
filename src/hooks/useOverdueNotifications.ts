"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { fetchTasks } from "@/services/taskApi";
import { fetchUsers } from "@/services/userApi";
import { getVisibleUserIds } from "@/lib/orgChart";
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

/** Overdue, not-done tasks assigned to the current user — refreshed on an interval so the bell stays roughly live without a push channel. */
export function useOverdueNotifications() {
  const { user } = useAuth();
  const { statuses } = useTaskMeta();
  const [tasks, setTasks] = useState<Task[]>([]);
  const isAdmin = user ? canManageUsers(user.role) : false;

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function load() {
      const allUsers = await fetchUsers();
      const visibleUserIds = getVisibleUserIds(allUsers, userId);
      const [taskList, disputeList] = await Promise.all([
        fetchTasks({ userId, isAdmin, module: "task", visibleUserIds }),
        fetchTasks({ userId, isAdmin, module: "dispute", visibleUserIds }),
      ]);
      if (!cancelled) setTasks([...taskList, ...disputeList]);
    }

    load();
    const interval = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);

  const doneStatusId = statuses[statuses.length - 1]?.id;

  const overdue = useMemo<OverdueNotification[]>(() => {
    if (!user || !doneStatusId) return [];
    return tasks
      .filter((t) => t.assigneeIds.includes(user.id) && t.status !== doneStatusId && isOverdue(t.dueDate))
      .map((t) => ({ id: t.id, title: t.title, module: t.module, dueDate: t.dueDate as string }))
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  }, [tasks, user, doneStatusId]);

  return { overdue, count: overdue.length };
}
