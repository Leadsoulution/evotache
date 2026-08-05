"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useConversations } from "@/hooks/useConversations";
import { fetchTasks } from "@/services/taskApi";
import { fetchPurchaseItems } from "@/services/purchaseApi";
import { fetchCalls } from "@/services/callApi";
import { getLastViewed, markViewed } from "@/services/notificationPrefsApi";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import type { Task } from "@/types/task";
import type { PurchaseItem } from "@/types/purchase";

const POLL_MS = 20_000;
const EPOCH = "1970-01-01T00:00:00.000Z";

const PATH_MODULE: Record<string, string> = {
  "/tasks": "tasks",
  "/disputes": "disputes",
  "/achats": "achats",
  "/calls": "calls",
};

export interface NavBadgeCounts {
  "/tasks": number;
  "/disputes": number;
  "/achats": number;
  "/chat": number;
  "/calls": number;
}

const EMPTY_COUNTS: NavBadgeCounts = { "/tasks": 0, "/disputes": 0, "/achats": 0, "/chat": 0, "/calls": 0 };

/** WhatsApp-style unread badges for the nav: tasks/litiges/achats assigned to
 * you and changed since you last opened that section, plus the chat unread total.
 *
 * Uses the same SWR keys as useTasks/usePurchaseItems ("tasks"/module and
 * "purchase-items") so this hook — mounted globally in the app shell —
 * shares its data with whatever page-level hooks are already fetching the
 * same resources, instead of firing its own duplicate requests. */
export function useNavBadgeCounts(): NavBadgeCounts {
  const { user } = useAuth();
  const { statuses } = useTaskMeta();
  const { unreadCounts } = useConversations();
  const pathname = usePathname();
  const [lastViewed, setLastViewed] = useState<Record<string, string>>({});
  const isAdmin = user ? canManageUsers(user.role) : false;
  const canSeeCalls = user ? canManageUsers(user.role) || canManageWorkflow(user.role) : false;

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
  const purchasesSWR = useSWR<PurchaseItem[]>(
    user ? "purchase-items" : null,
    () => fetchPurchaseItems({ userId: user!.id, isAdmin }),
    { refreshInterval: POLL_MS }
  );
  const callsSWR = useSWR(canSeeCalls ? "phone-calls" : null, fetchCalls, { refreshInterval: POLL_MS });

  useEffect(() => {
    if (!user) return;
    getLastViewed(user.id)
      .then((prefs) => setLastViewed(prefs))
      .catch(() => {});
  }, [user]);

  // Re-revalidate on every navigation (not just the poll interval) so
  // assigning something and switching pages reflects in the badge right away.
  useEffect(() => {
    if (!user) return;
    void tasksSWR.mutate();
    void disputesSWR.mutate();
    void purchasesSWR.mutate();
    void callsSWR.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?.id]);

  // Visiting a tracked page clears its badge immediately instead of waiting
  // for the next poll tick.
  useEffect(() => {
    if (!user) return;
    const moduleKey = PATH_MODULE[pathname];
    if (!moduleKey) return;
    const userId = user.id;
    markViewed(userId, moduleKey)
      .then(() => {
        setLastViewed((current) => ({ ...current, [moduleKey]: new Date().toISOString() }));
      })
      .catch(() => {});
  }, [pathname, user]);

  const doneStatusId = statuses[statuses.length - 1]?.id;

  return useMemo(() => {
    if (!user) return EMPTY_COUNTS;
    const tasks = tasksSWR.data ?? [];
    const disputes = disputesSWR.data ?? [];
    const purchases = purchasesSWR.data ?? [];
    const calls = callsSWR.data?.calls ?? [];
    const tasksSince = lastViewed.tasks ?? EPOCH;
    const disputesSince = lastViewed.disputes ?? EPOCH;
    const achatsSince = lastViewed.achats ?? EPOCH;
    const callsSince = lastViewed.calls ?? EPOCH;
    const tasksCount = tasks.filter((t) => t.assigneeIds.includes(user.id) && t.status !== doneStatusId && t.updatedAt > tasksSince).length;
    const disputesCount = disputes.filter((t) => t.assigneeIds.includes(user.id) && t.status !== doneStatusId && t.updatedAt > disputesSince).length;
    const achatsCount = purchases.filter((p) => p.assigneeIds.includes(user.id) && p.updatedAt > achatsSince).length;
    const chatCount = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);
    const callsCount = calls.filter((c) => c.status === "Unanswered" && c.createdAt > callsSince).length;
    return { "/tasks": tasksCount, "/disputes": disputesCount, "/achats": achatsCount, "/chat": chatCount, "/calls": callsCount };
  }, [tasksSWR.data, disputesSWR.data, purchasesSWR.data, callsSWR.data, lastViewed, unreadCounts, user, doneStatusId]);
}
