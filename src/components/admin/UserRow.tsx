"use client";

import { Avatar } from "@/components/ui/Avatar";
import { RoleMenu } from "./RoleMenu";
import { UserStatusToggle } from "./UserStatusToggle";
import { TrashIcon } from "@/components/ui/icons";
import type { AppUser, Role, UserStatus } from "@/types/user";

interface UserRowProps {
  targetUser: AppUser;
  isSelf: boolean;
  onChangeRole: (id: string, role: Role) => void;
  onChangeStatus: (id: string, status: UserStatus) => void;
  onRequestDelete: (id: string) => void;
}

export function UserRow({ targetUser, isSelf, onChangeRole, onChangeStatus, onRequestDelete }: UserRowProps) {
  return (
    <tr className="group border-b border-slate-100 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={targetUser.name} color={targetUser.color} size="sm" />
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
        <RoleMenu value={targetUser.role} onChange={(role) => onChangeRole(targetUser.id, role)} disabled={isSelf} />
      </td>
      <td className="px-2 py-2.5">
        <UserStatusToggle status={targetUser.status} onChange={(status) => onChangeStatus(targetUser.id, status)} disabled={isSelf} />
      </td>
      <td className="px-2 py-2.5 text-xs text-slate-400">{new Date(targetUser.createdAt).toLocaleDateString()}</td>
      <td className="px-2 py-2.5 text-right">
        <button
          type="button"
          disabled={isSelf}
          onClick={() => onRequestDelete(targetUser.id)}
          className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label={`Delete user ${targetUser.name}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
