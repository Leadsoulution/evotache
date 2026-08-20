import type { Task as DbTask } from "@/generated/prisma/client";
import type { RecurrenceRule, Task } from "@/types/task";

export function toPublicTask(task: DbTask): Task {
  return {
    id: task.id,
    module: task.module,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeIds: task.assigneeIds,
    teamIds: task.teamIds,
    excludedUserIds: task.excludedUserIds,
    startDate: task.startDate ? task.startDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    recurrence: (task.recurrence as RecurrenceRule | null) ?? null,
    order: task.order,
    parentId: task.parentId,
    projectId: task.projectId,
    customValues: (task.customValues as Record<string, string>) ?? {},
    createdBy: task.createdBy,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
