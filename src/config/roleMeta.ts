import type { Role } from "@/types/user";

interface RoleMeta {
  label: string;
  description: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
}

export const ROLE_ORDER: Role[] = ["admin", "member", "member_limited", "viewer"];

export const ROLE_CONFIG: Record<Role, RoleMeta> = {
  admin: {
    label: "Admin",
    description: "Full control: manage tasks, workflow, and users & roles.",
    dotColor: "bg-purple-500",
    textColor: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50 dark:bg-purple-950",
  },
  member: {
    label: "Member",
    description: "Everything an admin can do, except managing users.",
    dotColor: "bg-blue-500",
    textColor: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  member_limited: {
    label: "Limited member",
    description: "Can add tasks for themselves and change task status. Nothing else.",
    dotColor: "bg-teal-500",
    textColor: "text-teal-700 dark:text-teal-300",
    bgColor: "bg-teal-50 dark:bg-teal-950",
  },
  viewer: {
    label: "Viewer",
    description: "Can view tasks and change their status. Cannot create or edit anything else.",
    dotColor: "bg-slate-400",
    textColor: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
};

export interface Capability {
  key: string;
  label: string;
}

export const CAPABILITIES: Capability[] = [
  { key: "tasks:view", label: "View tasks" },
  { key: "tasks:create", label: "Create tasks" },
  { key: "tasks:edit", label: "Edit all task fields" },
  { key: "tasks:edit_status", label: "Change task status" },
  { key: "tasks:delete", label: "Delete tasks" },
  { key: "workflow:manage", label: "Manage statuses, priorities & custom fields" },
  { key: "users:manage", label: "Manage users & roles" },
];

const ROLE_CAPABILITIES: Record<Role, ReadonlySet<string>> = {
  admin: new Set(["tasks:view", "tasks:create", "tasks:edit", "tasks:edit_status", "tasks:delete", "workflow:manage", "users:manage"]),
  member: new Set(["tasks:view", "tasks:create", "tasks:edit", "tasks:edit_status", "tasks:delete", "workflow:manage"]),
  member_limited: new Set(["tasks:view", "tasks:create", "tasks:edit_status"]),
  viewer: new Set(["tasks:view", "tasks:edit_status"]),
};

export function hasCapability(role: Role, capability: string): boolean {
  return ROLE_CAPABILITIES[role].has(capability);
}

export function canCreateTasks(role: Role): boolean {
  return hasCapability(role, "tasks:create");
}

export function canEditTasksFull(role: Role): boolean {
  return hasCapability(role, "tasks:edit");
}

export function canEditTaskStatus(role: Role): boolean {
  return hasCapability(role, "tasks:edit_status");
}

export function canDeleteTasks(role: Role): boolean {
  return hasCapability(role, "tasks:delete");
}

export function canManageWorkflow(role: Role): boolean {
  return hasCapability(role, "workflow:manage");
}

export function canManageUsers(role: Role): boolean {
  return hasCapability(role, "users:manage");
}

interface AccessCheckUser {
  role: Role;
  extraSectionHrefs?: string[] | null;
}

// /calls and /biometrie are admin-only by default (unlike /admin itself,
// which stays admin+member) — an admin can grant any other user view
// access individually via extraSectionHrefs, which is purely additive: it
// never restricts a role that already has access.
export function canAccessCalls(user: AccessCheckUser): boolean {
  return canManageUsers(user.role) || (user.extraSectionHrefs ?? []).includes("/calls");
}

export function canAccessBiometrics(user: AccessCheckUser): boolean {
  return canManageUsers(user.role) || (user.extraSectionHrefs ?? []).includes("/biometrie");
}
