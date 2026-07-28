"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useConversations } from "@/hooks/useConversations";
import { fetchTasks } from "@/services/taskApi";
import { fetchPurchaseItems } from "@/services/purchaseApi";
import { fetchUsers } from "@/services/userApi";
import { getLastViewed, markViewed } from "@/services/notificationPrefsApi";
import { getVisibleUserIds } from "@/lib/orgChart";
import { canManageUsers } from "@/config/roleMeta";
import type { Task } from "@/types/task";
import type { PurchaseItem } from "@/types/purchase";

const POLL_MS = 20_000;
const EPOCH = "1970-01-01T00:00:00.000Z";

const PATH_MODULE: Record<string, string> = {
  "/tasks": "tasks",
  "/disputes": "disputes",
  "/achats": "achats",
};

export interface NavBadgeCounts {
  "/tasks": number;
  "/disputes": number;
  "/achats": number;
  "/chat": number;
}

const EMPTY_COUNTS: NavBadgeCounts = { "/tasks": 0, "/disputes": 0, "/achats": 0, "/chat": 0 };

/** WhatsApp-style unread badges for the nav: tasks/litiges/achats assigned to
 * you and changed since you last opened that section, plus the chat unread total. */
export function useNavBadgeCounts(): NavBadgeCounts {
  const { user } = useAuth();
  const { statuses } = useTaskMeta();
  const { unreadCounts } = useConversations();
  const pathname = usePathname();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [disputes, setDisputes] = useState<Task[]>([]);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [lastViewed, setLastViewed] = useState<Record<string, string>>({});
  const isAdmin = user ? canManageUsers(user.role) : false;

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    function load() {
      Promise.all([fetchUsers(), getLastViewed(userId)])
        .then(([allUsers, prefs]) => {
          const visibleUserIds = getVisibleUserIds(allUsers, userId);
          return Promise.all([
            fetchTasks({ userId, isAdmin, module: "task", visibleUserIds }),
            fetchTasks({ userId, isAdmin, module: "dispute", visibleUserIds }),
            fetchPurchaseItems({ userId, isAdmin }),
          ]).then(([taskList, disputeList, purchaseList]) => {
            if (cancelled) return;
            setTasks(taskList);
            setDisputes(disputeList);
            setPurchases(purchaseList);
            setLastViewed(prefs);
          });
        })
        .catch(() => {});
    }

    load();
    const interval = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // Re-run on every navigation too (not just mount + interval) so
    // assigning something and switching pages reflects in the badge right
    // away instead of waiting for the next poll tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, pathname]);

  // Visiting a tracked page clears its badge immediately instead of waiting
  // for the next poll tick — setState only inside the .then(), per the
  // set-state-in-effect rule.
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
    const tasksSince = lastViewed.tasks ?? EPOCH;
    const disputesSince = lastViewed.disputes ?? EPOCH;
    const achatsSince = lastViewed.achats ?? EPOCH;
    const tasksCount = tasks.filter((t) => t.assigneeIds.includes(user.id) && t.status !== doneStatusId && t.updatedAt > tasksSince).length;
    const disputesCount = disputes.filter((t) => t.assigneeIds.includes(user.id) && t.status !== doneStatusId && t.updatedAt > disputesSince).length;
    const achatsCount = purchases.filter((p) => p.assigneeIds.includes(user.id) && p.updatedAt > achatsSince).length;
    const chatCount = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);
    return { "/tasks": tasksCount, "/disputes": disputesCount, "/achats": achatsCount, "/chat": chatCount };
  }, [tasks, disputes, purchases, lastViewed, unreadCounts, user, doneStatusId]);
}
