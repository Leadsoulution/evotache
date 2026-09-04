import type { Role } from "@/types/user";

interface RoleMeta {
  label: string;
  description: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
}

// The 4 generally-selectable roles — used by every role picker that should
// list roles for arbitrary users (UserFormDialog's create/edit form, the
// default RoleMenu options). super_admin is deliberately excluded here: it
// only ever appears as an option on SUPER_ADMIN_USER_ID's own row (see
// RoleMenu's `allowSuperAdmin` prop), never as a generally-assignable role.
export const ROLE_ORDER: Role[] = ["admin", "member", "member_limited", "viewer"];

// Every role including super_admin — only for read-only documentation
// (RolePermissionsCard's capability matrix), never for a picker: nobody
// should be able to *choose* super_admin except on that one account's own
// row (see RoleMenu's allowSuperAdmin prop).
export const ALL_ROLE_ORDER: Role[] = ["super_admin", ...ROLE_ORDER];

// Meant for exactly one account — full admin control plus the Salaires
// (payroll) section of Biométrie, which even a regular admin can no longer
// see or edit. Enforced server-side (the user-role PATCH route rejects
// assigning super_admin to any other id), not just a UI convention.
export const SUPER_ADMIN_USER_ID = "u2"; // "ADM DEV"

export const ROLE_CONFIG: Record<Role, RoleMeta> = {
  super_admin: {
    label: "Super Admin",
    description: "Full admin control, plus the only role that can see or edit the Salaires (payroll) section.",
    dotColor: "bg-amber-500",
    textColor: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-950",
  },
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
  { key: "tasks:edit", label: "Edit tasks they created (admins: any task)" },
  { key: "tasks:edit_status", label: "Change task status" },
  { key: "tasks:delete", label: "Delete tasks" },
  { key: "workflow:manage", label: "Manage statuses, priorities & custom fields" },
  { key: "users:manage", label: "Manage users & roles" },
  { key: "workshop:create", label: "Add a repair to Atelier" },
  { key: "workshop:edit_status", label: "Change repair status & run the chrono" },
  { key: "workshop:delete", label: "Delete a repair" },
  { key: "payroll:view", label: "View & edit the Salaires (payroll) section of Biométrie" },
];

const ADMIN_CAPABILITIES = [
  "tasks:view",
  "tasks:create",
  "tasks:edit",
  "tasks:edit_status",
  "tasks:delete",
  "workflow:manage",
  "users:manage",
  "workshop:create",
  "workshop:edit_status",
  "workshop:delete",
] as const;

const ROLE_CAPABILITIES: Record<Role, ReadonlySet<string>> = {
  // Same full set as admin, plus payroll:view — nothing an admin can do
  // that a super_admin can't, and one thing (Salaires) an admin can't.
  super_admin: new Set([...ADMIN_CAPABILITIES, "payroll:view"]),
  admin: new Set(ADMIN_CAPABILITIES),
  member: new Set([
    "tasks:view",
    "tasks:create",
    "tasks:edit",
    "tasks:edit_status",
    "tasks:delete",
    "workflow:manage",
    "workshop:create",
    "workshop:edit_status",
    "workshop:delete",
  ]),
  member_limited: new Set(["tasks:view", "tasks:create", "tasks:edit", "tasks:edit_status", "workshop:create", "workshop:edit_status"]),
  viewer: new Set(["tasks:view", "tasks:edit_status", "workshop:edit_status"]),
};

export function hasCapability(role: Role, capability: string): boolean {
  return ROLE_CAPABILITIES[role].has(capability);
}

export function canCreateTasks(role: Role): boolean {
  return hasCapability(role, "tasks:create");
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

export function canCreateWorkshopRepairs(role: Role): boolean {
  return hasCapability(role, "workshop:create");
}

export function canEditWorkshopStatus(role: Role): boolean {
  return hasCapability(role, "workshop:edit_status");
}

export function canDeleteWorkshopRepairs(role: Role): boolean {
  return hasCapability(role, "workshop:delete");
}

export function canViewPayroll(role: Role): boolean {
  return hasCapability(role, "payroll:view");
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
