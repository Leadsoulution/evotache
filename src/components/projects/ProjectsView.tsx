"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useTeams } from "@/hooks/useTeams";
import { useTasks } from "@/hooks/useTasks";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import { ProjectDialog } from "./ProjectDialog";
import { ProjectAvatar } from "./ProjectAvatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { FolderIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import type { Project } from "@/types/project";

export function ProjectsView() {
  const { user } = useAuth();
  const isAdmin = user ? canManageUsers(user.role) : false;
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { projects: allProjects, loadState, addProject, editProject, removeProject } = useProjects();
  const { teams } = useTeams();
  const { tasks } = useTasks("task");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Only admins get full org oversight — everyone else only sees projects
  // owned by a team they belong to (a project with no team is unscoped and
  // stays visible to everyone).
  const myTeamIds = user ? teams.filter((team) => team.memberIds.includes(user.id)).map((team) => team.id) : [];
  const projects =
    isAdmin || !user ? allProjects : allProjects.filter((project) => project.teamIds.length === 0 || project.teamIds.some((id) => myTeamIds.includes(id)));

  const taskCountByProject = tasks.reduce<Record<string, number>>((acc, task) => {
    if (task.projectId) acc[task.projectId] = (acc[task.projectId] ?? 0) + 1;
    return acc;
  }, {});

  const pendingProject = projects.find((p) => p.id === pendingDeleteId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Group tasks under a project, then jump into its task list.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setDialogOpen(true);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4" />
            New project
          </button>
        )}
      </header>

      {loadState === "loading" && <TaskListSkeleton />}

      {loadState === "success" && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <FolderIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No projects yet</p>
        </div>
      )}

      {loadState === "success" && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
            >
              <Link href={`/tasks?project=${project.id}`} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ProjectAvatar project={project} size="md" />
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{project.name}</span>
                </div>
                <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{project.description || "No description"}</p>
                <p className="text-xs font-medium text-slate-400">{taskCountByProject[project.id] ?? 0} tasks</p>
              </Link>
              {canManage && (
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject(project);
                      setDialogOpen(true);
                    }}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    aria-label={`Edit ${project.name}`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(project.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    aria-label={`Delete ${project.name}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        project={editingProject}
        teams={teams}
        onClose={() => setDialogOpen(false)}
        onSubmit={(input) => (editingProject ? editProject(editingProject.id, input).then(() => true) : addProject(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this project?"
        description={pendingProject ? `"${pendingProject.name}" will be removed. Tasks already linked to it keep their history but lose the project link.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await removeProject(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
