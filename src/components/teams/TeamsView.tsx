"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTeams } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { useTasks } from "@/hooks/useTasks";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import { Avatar } from "@/components/ui/Avatar";
import { TeamDialog } from "@/components/admin/TeamDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { PencilIcon, PlusIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import type { Team } from "@/types/team";

export function TeamsView() {
  const { user } = useAuth();
  const isAdmin = user ? canManageUsers(user.role) : false;
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { teams: allTeams, loadState, addTeam, editTeam, removeTeam } = useTeams();
  const { users } = useUsers();
  const { tasks } = useTasks("task");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Only admins get full org oversight here — everyone else sees just the
  // teams they're actually a member of.
  const teams = isAdmin || !user ? allTeams : allTeams.filter((team) => team.memberIds.includes(user.id));

  const usersById = new Map(users.map((u) => [u.id, u]));
  const taskCountByTeam = tasks.reduce<Record<string, number>>((acc, task) => {
    for (const teamId of task.teamIds ?? []) acc[teamId] = (acc[teamId] ?? 0) + 1;
    return acc;
  }, {});

  const pendingTeam = teams.find((t) => t.id === pendingDeleteId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Teams</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Open a team to see its tasks, or assign a team to tasks and projects.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditingTeam(null);
              setDialogOpen(true);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4" />
            New team
          </button>
        )}
      </header>

      {loadState === "loading" && <TaskListSkeleton />}

      {loadState === "success" && teams.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <UsersIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No teams yet</p>
        </div>
      )}

      {loadState === "success" && teams.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="group relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
            >
              <Link href={`/tasks?team=${team.id}`} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{team.name}</span>
                </div>

                <div className="flex items-center -space-x-1.5">
                  {team.memberIds.slice(0, 6).map((id) => {
                    const member = usersById.get(id);
                    if (!member) return null;
                    return <Avatar key={id} name={member.name} color={member.color} size="sm" />;
                  })}
                  {team.memberIds.length === 0 && <span className="text-xs text-slate-400">No members yet</span>}
                  {team.memberIds.length > 6 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-900">
                      +{team.memberIds.length - 6}
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-400">{taskCountByTeam[team.id] ?? 0} tasks</p>
              </Link>

              {canManage && (
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeam(team);
                      setDialogOpen(true);
                    }}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    aria-label={`Edit ${team.name}`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(team.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    aria-label={`Delete ${team.name}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TeamDialog
        open={dialogOpen}
        team={editingTeam}
        users={users}
        onClose={() => setDialogOpen(false)}
        onSubmit={(input) => (editingTeam ? editTeam(editingTeam.id, input).then(() => true) : addTeam(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this team?"
        description={pendingTeam ? `"${pendingTeam.name}" will be removed. Tasks and projects already linked to it keep their history but lose the team link.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await removeTeam(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
