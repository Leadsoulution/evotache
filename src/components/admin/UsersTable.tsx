import { UserRow } from "./UserRow";
import type { AppUser, Role, UserStatus } from "@/types/user";

interface UsersTableProps {
  users: AppUser[];
  currentUserId: string;
  onChangeRole: (id: string, role: Role) => void;
  onChangeStatus: (id: string, status: UserStatus) => void;
  onRequestDelete: (id: string) => void;
}

export function UsersTable({ users, currentUserId, onChangeRole, onChangeStatus, onRequestDelete }: UsersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="px-4 py-2.5">
              User
            </th>
            <th scope="col" className="w-36 px-2 py-2.5">
              Role
            </th>
            <th scope="col" className="w-32 px-2 py-2.5">
              Status
            </th>
            <th scope="col" className="w-28 px-2 py-2.5">
              Joined
            </th>
            <th scope="col" className="w-10 px-2 py-2.5" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {users.map((targetUser) => (
            <UserRow
              key={targetUser.id}
              targetUser={targetUser}
              isSelf={targetUser.id === currentUserId}
              onChangeRole={onChangeRole}
              onChangeStatus={onChangeStatus}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
