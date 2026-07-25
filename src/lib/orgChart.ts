import type { AppUser } from "@/types/user";

/**
 * A user can see their own tasks plus every direct/indirect subordinate's
 * tasks (walking the manager -> report chain), so a manager doesn't need
 * to be assigned a task themselves to see their team's work.
 */
export function getVisibleUserIds(users: AppUser[], currentUserId: string): string[] {
  const childrenByManager = new Map<string, string[]>();
  for (const user of users) {
    for (const managerId of user.managerIds ?? []) {
      const list = childrenByManager.get(managerId) ?? [];
      list.push(user.id);
      childrenByManager.set(managerId, list);
    }
  }

  const visible = new Set<string>([currentUserId]);
  const stack = [currentUserId];
  while (stack.length) {
    const id = stack.pop() as string;
    const reports = childrenByManager.get(id) ?? [];
    for (const reportId of reports) {
      if (visible.has(reportId)) continue;
      visible.add(reportId);
      stack.push(reportId);
    }
  }
  return Array.from(visible);
}

/** Prevents assigning a manager that would create a cycle (B can't manage A if A already manages B, directly or indirectly). */
export function wouldCreateManagerCycle(users: AppUser[], userId: string, proposedManagerId: string): boolean {
  if (userId === proposedManagerId) return true;
  return getVisibleUserIds(users, userId).includes(proposedManagerId);
}
