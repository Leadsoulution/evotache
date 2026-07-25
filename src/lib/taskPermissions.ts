import { canCreateTasks, canDeleteTasks, canEditTaskStatus, canEditTasksFull } from "@/config/roleMeta";
import type { Role } from "@/types/user";

export interface TaskPermissions {
  canCreate: boolean;
  canEditFull: boolean;
  canEditStatus: boolean;
  canDelete: boolean;
}

const NO_PERMISSIONS: TaskPermissions = { canCreate: false, canEditFull: false, canEditStatus: false, canDelete: false };

export function getTaskPermissions(role: Role | undefined): TaskPermissions {
  if (!role) return NO_PERMISSIONS;
  return {
    canCreate: canCreateTasks(role),
    canEditFull: canEditTasksFull(role),
    canEditStatus: canEditTaskStatus(role),
    canDelete: canDeleteTasks(role),
  };
}
