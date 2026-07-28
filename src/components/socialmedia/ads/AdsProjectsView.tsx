"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAdProjects } from "@/hooks/useAdProjects";
import { canManageWorkflow } from "@/config/roleMeta";
import { AdProjectDialog } from "./AdProjectDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { formatCurrency } from "@/lib/adMetrics";
import { formatDueDate } from "@/lib/date";
import { PLATFORM_META, AD_PROJECT_STATUS_META } from "@/config/socialMeta";
import { ArchiveIcon, MegaphoneIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import type { AdProject } from "@/types/socialMedia";

export function AdsProjectsView() {
  const { user } = useAuth();
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { projects, loadState, addProject, editProject, toggleArchive, removeProject } = useAdProjects();

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<AdProject | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const visibleProjects = projects.filter((p) => (tab === "archived" ? p.archived : !p.archived));
  const pendingProject = projects.find((p) => p.id === pendingDeleteId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Ads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage advertising projects and their campaigns.</p>
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

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" style={{ width: "fit-content" }}>
        {(["active", "archived"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
              tab === t ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loadState === "loading" && <TaskListSkeleton />}

      {loadState === "success" && visibleProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <MegaphoneIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{tab === "archived" ? "No archived projects" : "No ad projects yet"}</p>
        </div>
      )}

      {loadState === "success" && visibleProjects.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => {
            const platform = PLATFORM_META[project.platform];
            const status = AD_PROJECT_STATUS_META[project.status];
            return (
              <div
                key={project.id}
                className="group relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
              >
                <Link href={`/social/ads/${project.id}`} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: `${platform.color}22`, color: platform.color }}
                    >
                      {platform.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${status.color}22`, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                  <div>
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{project.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{project.client}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {project.startDate ? formatDueDate(project.startDate) : "No start"} → {project.endDate ? formatDueDate(project.endDate) : "No end"}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(project.totalBudget)}</span>
                  </div>
                </Link>

                {canManage && (
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => toggleArchive(project.id, !project.archived)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                      aria-label={project.archived ? `Unarchive ${project.name}` : `Archive ${project.name}`}
                    >
                      <ArchiveIcon className="h-4 w-4" />
                    </button>
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
            );
          })}
        </div>
      )}

      <AdProjectDialog
        open={dialogOpen}
        project={editingProject}
        onClose={() => setDialogOpen(false)}
        onSubmit={(input) => (editingProject ? editProject(editingProject.id, input).then(() => true) : addProject(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this ad project?"
        description={pendingProject ? `"${pendingProject.name}" and all its campaigns will be permanently deleted. This cannot be undone.` : ""}
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
