"use client";

import { useEffect, useState } from "react";
import {
  createAgentReportSchedule,
  deleteAgentReportSchedule,
  fetchAllAgentReportSchedules,
  setAgentReportScheduleEnabled,
} from "@/services/agentApi";
import { useToast } from "@/components/ui/Toast";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { AGENT_REPORT_TYPES } from "@/types/agent";
import type { AgentReportSchedule, AgentReportType } from "@/types/agent";
import type { AppUser } from "@/types/user";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

interface ScheduledReportsSectionProps {
  users: AppUser[];
}

/** Lets any admin set up "agent sends person X a report at fixed times each
 * day" without going through a specific agent's own edit dialog — same
 * underlying AgentReportSchedule CRUD as AgentFormDialog's "Scheduled
 * reports" fieldset, just page-level and agent-agnostic (with its own
 * agent picker) rather than scoped to whichever agent happens to be open. */
export function ScheduledReportsSection({ users }: ScheduledReportsSectionProps) {
  const toast = useToast();
  const agents = users.filter((u) => u.isAgent);
  const recipientCandidates = users.filter((u) => !u.isAgent && u.status === "active");

  const [schedules, setSchedules] = useState<AgentReportSchedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newAgentId, setNewAgentId] = useState("");
  const [newRecipientId, setNewRecipientId] = useState("");
  const [newTimes, setNewTimes] = useState<string[]>(["09:00"]);
  const [newTypes, setNewTypes] = useState<AgentReportType[]>([]);
  const [adding, setAdding] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllAgentReportSchedules()
      .then(setSchedules)
      .finally(() => setLoaded(true));
  }, []);

  function toggleType(type: AgentReportType) {
    setNewTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]));
  }

  function updateTime(index: number, value: string) {
    setNewTimes((current) => current.map((t, i) => (i === index ? value : t)));
  }

  function removeTime(index: number) {
    setNewTimes((current) => current.filter((_, i) => i !== index));
  }

  async function handleAdd() {
    const times = newTimes.filter(Boolean);
    if (!newAgentId || !newRecipientId || times.length === 0 || newTypes.length === 0) return;
    setAdding(true);
    try {
      const schedule = await createAgentReportSchedule(newAgentId, { recipientId: newRecipientId, timesOfDay: times, reportTypes: newTypes });
      setSchedules((current) => [...current, schedule]);
      setNewRecipientId("");
      setNewTimes(["09:00"]);
      setNewTypes([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'ajout.");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(schedule: AgentReportSchedule, enabled: boolean) {
    setActionId(schedule.id);
    try {
      const updated = await setAgentReportScheduleEnabled(schedule.agentId, schedule.id, enabled);
      setSchedules((current) => current.map((s) => (s.id === schedule.id ? { ...s, enabled: updated.enabled } : s)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la mise à jour.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(schedule: AgentReportSchedule) {
    setActionId(schedule.id);
    try {
      await deleteAgentReportSchedule(schedule.agentId, schedule.id);
      setSchedules((current) => current.filter((s) => s.id !== schedule.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la suppression.");
    } finally {
      setActionId(null);
    }
  }

  if (loaded && agents.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Rapports programmés</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Un agent IA envoie un rapport à une personne précise par chat, à heures fixes chaque jour (heure de Casablanca).</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        {schedules.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-2 dark:bg-slate-800">
                <div className="text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-medium">{schedule.agentName}</span> → <span className="font-medium">{schedule.recipientName}</span> —{" "}
                  {schedule.timesOfDay.join(", ")}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {schedule.reportTypes.map((t) => AGENT_REPORT_TYPES.find((r) => r.id === t)?.label ?? t).join(" · ")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      disabled={actionId === schedule.id}
                      onChange={(event) => handleToggle(schedule, event.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                    />
                    Actif
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDelete(schedule)}
                    disabled={actionId === schedule.id}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={cn("flex flex-col gap-2", schedules.length > 0 && "border-t border-slate-100 pt-2 dark:border-slate-800")}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={newAgentId} onChange={(event) => setNewAgentId(event.target.value)} className={inputClass}>
              <option value="">Agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select value={newRecipientId} onChange={(event) => setNewRecipientId(event.target.value)} className={inputClass}>
              <option value="">Destinataire…</option>
              {recipientCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            {newTimes.map((time, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <input type="time" value={time} onChange={(event) => updateTime(index, event.target.value)} className={cn(inputClass, "w-auto")} />
                {newTimes.length > 1 && (
                  <button type="button" onClick={() => removeTime(index)} aria-label="Supprimer l'heure" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setNewTimes((current) => [...current, "09:00"])}
              className="inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Ajouter une heure
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {AGENT_REPORT_TYPES.map((type) => (
              <label key={type.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={newTypes.includes(type.id)}
                  onChange={() => toggleType(type.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                />
                {type.label}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newAgentId || !newRecipientId || newTimes.filter(Boolean).length === 0 || newTypes.length === 0}
            className="w-fit rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {adding ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
