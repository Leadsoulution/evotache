"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReminderRules } from "@/hooks/useReminderRules";
import { useUsers } from "@/hooks/useUsers";
import { useTeams } from "@/hooks/useTeams";
import { canManageWorkflow } from "@/config/roleMeta";
import { ReminderRuleDialog } from "./ReminderRuleDialog";
import { ScheduledReportsSection } from "./ScheduledReportsSection";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { ErrorState } from "@/components/task-list/ErrorState";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { formatRelativeTime } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { ReminderRule } from "@/types/reminder";

export function RemindersView() {
  const { user } = useAuth();
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { rules, loadState, errorMessage, refetch, addRule, editRule, removeRule } = useReminderRules();
  const { users } = useUsers();
  const { teams } = useTeams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (!user) return null;

  const pendingDeleteRule = rules.find((r) => r.id === pendingDeleteId) ?? null;

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    await removeRule(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Reminders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Plan recurring nudges for overdue tasks and one-off meeting reminders, delivered by push and/or an AI agent in chat.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditingRule(null);
              setFormOpen(true);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4" />
            New rule
          </button>
        )}
      </header>

      {loadState === "loading" && <TaskListSkeleton />}
      {loadState === "error" && <ErrorState message={errorMessage ?? "Unknown error."} onRetry={refetch} />}
      {loadState === "success" && rules.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No reminder rules yet.
        </div>
      )}
      {loadState === "success" && rules.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="px-4 py-2.5">Name</th>
                <th scope="col" className="px-4 py-2.5">Type</th>
                <th scope="col" className="px-4 py-2.5">Schedule</th>
                <th scope="col" className="px-4 py-2.5">Last sent</th>
                <th scope="col" className="px-4 py-2.5">Enabled</th>
                <th scope="col" className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{rule.name}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        rule.kind === "overdue_escalation"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      )}
                    >
                      {rule.kind === "overdue_escalation" ? "Overdue escalation" : "Meeting"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                    {rule.kind === "overdue_escalation"
                      ? rule.timesOfDay.length > 0
                        ? rule.timesOfDay.join(", ")
                        : "No times set"
                      : rule.meetingAt
                        ? `${new Date(rule.meetingAt).toLocaleString()} (${rule.minutesBefore}min before)`
                        : "No date set"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{rule.lastRunAt ? formatRelativeTime(rule.lastRunAt) : "Never"}</td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.enabled}
                      disabled={!canManage}
                      onClick={() => editRule(rule.id, { enabled: !rule.enabled })}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        rule.enabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", rule.enabled ? "translate-x-4.5" : "translate-x-0.5")} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRule(rule);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${rule.name}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(rule.id)}
                          aria-label={`Delete ${rule.name}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && <ScheduledReportsSection users={users} />}

      <ReminderRuleDialog
        open={formOpen}
        editingRule={editingRule}
        users={users}
        teams={teams}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => (editingRule ? editRule(editingRule.id, input).then(() => true) : addRule(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this reminder rule?"
        description={pendingDeleteRule ? `"${pendingDeleteRule.name}" will stop sending reminders immediately.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
