"use client";

import { Avatar } from "@/components/ui/Avatar";
import { RoleMenu } from "./RoleMenu";
import { UserStatusToggle } from "./UserStatusToggle";
import { ManagerMenu } from "./ManagerMenu";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import { SUPER_ADMIN_USER_ID } from "@/config/roleMeta";
import type { AppUser, Role, UserStatus } from "@/types/user";

interface UserRowProps {
  targetUser: AppUser;
  isSelf: boolean;
  allUsers: AppUser[];
  onChangeRole: (id: string, role: Role) => void;
  onChangeStatus: (id: string, status: UserStatus) => void;
  onChangeManager: (id: string, managerIds: string[]) => void;
  onRequestEdit: (user: AppUser) => void;
  onRequestDelete: (id: string) => void;
}

export function UserRow({ targetUser, isSelf, allUsers, onChangeRole, onChangeStatus, onChangeManager, onRequestEdit, onRequestDelete }: UserRowProps) {
  return (
    <tr className="group border-b border-slate-100 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={targetUser.name} color={targetUser.color} photoDataUrl={targetUser.photoDataUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {targetUser.name}
              {isSelf && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
            </p>
            <p className="truncate text-xs text-slate-400">{targetUser.email}</p>
          </div>
        </div>
      </td>
      <td className="px-2 py-2.5">
        <RoleMenu
          value={targetUser.role}
          onChange={(role) => onChangeRole(targetUser.id, role)}
          disabled={isSelf}
          allowSuperAdmin={targetUser.id === SUPER_ADMIN_USER_ID}
        />
      </td>
      <td className="px-2 py-2.5">
        <UserStatusToggle status={targetUser.status} onChange={(status) => onChangeStatus(targetUser.id, status)} disabled={isSelf} />
      </td>
      <td className="px-2 py-2.5">
        <ManagerMenu targetUser={targetUser} users={allUsers} onChange={(managerIds) => onChangeManager(targetUser.id, managerIds)} />
      </td>
      <td className="px-2 py-2.5 text-xs text-slate-400">{new Date(targetUser.createdAt).toLocaleDateString()}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center justify-end gap-1 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onRequestEdit(targetUser)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"
            aria-label={`Edit user ${targetUser.name}`}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSelf}
            onClick={() => onRequestDelete(targetUser.id)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label={`Delete user ${targetUser.name}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
