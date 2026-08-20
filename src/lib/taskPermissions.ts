import { canCreateTasks, canDeleteTasks, canEditTaskStatus } from "@/config/roleMeta";
import type { Role } from "@/types/user";
import type { Task } from "@/types/task";

export interface TaskPermissions {
  canCreate: boolean;
  /** Admins can fully edit any task; everyone else only the ones they created themselves — mirrors the server-side check in src/app/api/tasks/[id]/route.ts. */
  canEditFull: (task: Task) => boolean;
  canEditStatus: boolean;
  canDelete: boolean;
}

const NO_PERMISSIONS: TaskPermissions = { canCreate: false, canEditFull: () => false, canEditStatus: false, canDelete: false };

export function getTaskPermissions(user: { id: string; role: Role } | undefined): TaskPermissions {
  if (!user) return NO_PERMISSIONS;
  return {
    canCreate: canCreateTasks(user.role),
    canEditFull: (task) => user.role === "admin" || task.createdBy === user.id,
    canEditStatus: canEditTaskStatus(user.role),
    canDelete: canDeleteTasks(user.role),
  };
}
