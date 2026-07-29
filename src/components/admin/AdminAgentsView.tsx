"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAgents } from "@/hooks/useAgents";
import { canManageUsers } from "@/config/roleMeta";
import { AgentFormDialog } from "./AgentFormDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { ErrorState } from "@/components/task-list/ErrorState";
import { Avatar } from "@/components/ui/Avatar";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Agent } from "@/types/agent";

export function AdminAgentsView() {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user ? canManageUsers(user.role) : false;
  const { agents, loadState, errorMessage, refetch, createAgent, updateAgent, deleteAgent } = useAgents();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !allowed) router.replace("/admin/workflow");
  }, [user, allowed, router]);

  if (!allowed) return null;

  const pendingDeleteAgent = agents.find((a) => a.id === pendingDeleteId) ?? null;

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    await deleteAgent(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">AI agents</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create AI &quot;employees&quot; that chat like a person and act inside (or outside) the app.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingAgent(null);
            setFormOpen(true);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <PlusIcon className="h-4 w-4" />
          Add agent
        </button>
      </header>

      {loadState === "loading" && <TaskListSkeleton />}
      {loadState === "error" && <ErrorState message={errorMessage ?? "Unknown error."} onRetry={refetch} />}
      {loadState === "success" && agents.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No agents yet. Add one to get started.
        </div>
      )}
      {loadState === "success" && agents.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="px-4 py-2.5">Agent</th>
                <th scope="col" className="px-4 py-2.5">Kind</th>
                <th scope="col" className="px-4 py-2.5">Tools</th>
                <th scope="col" className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={agent.name} color={agent.color} photoDataUrl={agent.photoDataUrl} size="sm" />
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{agent.name}</span>
                        <span className="text-xs text-slate-400">{agent.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        agent.kind === "internal"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      )}
                    >
                      {agent.kind === "internal" ? "Internal" : "External"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                    {agent.enabledTools.length > 0 ? agent.enabledTools.join(", ") : "None"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAgent(agent);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${agent.name}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(agent.id)}
                        aria-label={`Delete ${agent.name}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AgentFormDialog
        open={formOpen}
        editingAgent={editingAgent}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => (editingAgent ? updateAgent(editingAgent.id, input) : createAgent(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Remove agent?"
        description={pendingDeleteAgent ? `${pendingDeleteAgent.name} and its schedules/activity log will be permanently removed.` : ""}
        confirmLabel="Remove"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
