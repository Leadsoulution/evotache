"use client";

import { useMemo, useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useTeams } from "@/hooks/useTeams";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { UsersToolbar } from "./UsersToolbar";
import { UsersTable } from "./UsersTable";
import { UserFormDialog } from "./UserFormDialog";
import { RolePermissionsCard } from "./RolePermissionsCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { ErrorState } from "@/components/task-list/ErrorState";
import type { AppUser, Role } from "@/types/user";

export function AdminUsersView() {
  const { user: currentUser } = useAuth();
  const { users, loadState, errorMessage, refetch, createUser, updateUser, deleteUser } = useUsers();
  const { teams } = useTeams();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [roleFilter, setRoleFilter] = useState<Role[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const visibleUsers = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return users.filter((candidate) => {
      if (roleFilter.length && !roleFilter.includes(candidate.role)) return false;
      if (term && !`${candidate.name} ${candidate.email}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [users, debouncedSearch, roleFilter]);

  const pendingDeleteUser = users.find((candidate) => candidate.id === pendingDeleteId) ?? null;

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    await deleteUser(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Users & access</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Create users and control what each role can do.</p>
      </header>

      <UsersToolbar
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        onInvite={() => {
          setEditingUser(null);
          setFormOpen(true);
        }}
        visibleCount={visibleUsers.length}
        totalCount={users.length}
      />

      {loadState === "loading" && <TaskListSkeleton />}
      {loadState === "error" && <ErrorState message={errorMessage ?? "Unknown error."} onRetry={refetch} />}
      {loadState === "success" && currentUser && (
        <UsersTable
          users={visibleUsers}
          allUsers={users}
          currentUserId={currentUser.id}
          onChangeRole={(id, role) => updateUser(id, { role })}
          onChangeStatus={(id, status) => updateUser(id, { status })}
          onChangeManager={(id, managerIds) => updateUser(id, { managerIds })}
          onRequestEdit={(targetUser) => {
            setEditingUser(targetUser);
            setFormOpen(true);
          }}
          onRequestDelete={setPendingDeleteId}
        />
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Role permissions</h2>
        <RolePermissionsCard />
      </section>

      <UserFormDialog
        open={formOpen}
        editingUser={editingUser}
        users={users}
        teams={teams}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => {
          if (editingUser) {
            const { password, ...rest } = input;
            return updateUser(editingUser.id, password ? { ...rest, password } : rest).then(() => true);
          }
          return createUser(input);
        }}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Remove user?"
        description={pendingDeleteUser ? `${pendingDeleteUser.name} will lose access immediately. This cannot be undone.` : ""}
        confirmLabel="Remove"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
