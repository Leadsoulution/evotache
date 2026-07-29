import { db } from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import { emailUser } from "@/lib/email";
import type { Task as DbTask } from "@/generated/prisma/client";

/** Notifies newly assigned users a task/litige was assigned to them, via both
 * push (every module) and email (task/litige modules only — chat messages
 * stay push-only to avoid flooding inboxes on every message). */
export async function notifyTaskAssignment(assigneeIds: string[], task: DbTask): Promise<void> {
  if (assigneeIds.length === 0) return;

  const isDispute = task.module === "dispute";
  const url = isDispute ? "/disputes" : "/tasks";
  const label = isDispute ? "litige" : "task";

  const users = await db.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, email: true, name: true } });

  for (const user of users) {
    void notifyUser(user.id, { title: `New ${label} assigned`, body: task.title, url });
    void emailUser(user.email, {
      subject: `New ${label} assigned: ${task.title}`,
      heading: `You were assigned a ${label}`,
      body: task.title,
      url,
    });
  }
}
