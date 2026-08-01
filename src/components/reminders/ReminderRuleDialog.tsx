"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Menu } from "@/components/ui/Menu";
import { Avatar } from "@/components/ui/Avatar";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { fromDateTimeInputValue, toDateTimeInputValue } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { ReminderKind, ReminderRule, ReminderRuleInput } from "@/types/reminder";
import type { AppUser } from "@/types/user";
import type { Team } from "@/types/team";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

interface ReminderRuleDialogProps {
  open: boolean;
  editingRule: ReminderRule | null;
  users: AppUser[];
  teams: Team[];
  onClose: () => void;
  onSubmit: (input: ReminderRuleInput & { resetLastRun?: boolean }) => Promise<boolean>;
}

const DEFAULT_TIMES = ["09:00", "13:00", "17:00"];

export function ReminderRuleDialog({ open, editingRule, users, teams, onClose, onSubmit }: ReminderRuleDialogProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ReminderKind>("overdue_escalation");
  const [enabled, setEnabled] = useState(true);
  const [timesOfDay, setTimesOfDay] = useState<string[]>(DEFAULT_TIMES);
  const [notifyAssignee, setNotifyAssignee] = useState(true);
  const [notifyManager, setNotifyManager] = useState(true);
  const [meetingAt, setMeetingAt] = useState("");
  const [minutesBefore, setMinutesBefore] = useState("30");
  const [wholeTeam, setWholeTeam] = useState(true);
  const [audienceUserIds, setAudienceUserIds] = useState<string[]>([]);
  const [audienceTeamIds, setAudienceTeamIds] = useState<string[]>([]);
  const [viaPush, setViaPush] = useState(true);
  const [viaAgentChat, setViaAgentChat] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const agents = users.filter((u) => u.isAgent);
  const nonAgentUsers = users.filter((u) => !u.isAgent);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(editingRule?.name ?? "");
      setKind(editingRule?.kind ?? "overdue_escalation");
      setEnabled(editingRule?.enabled ?? true);
      setTimesOfDay(editingRule?.timesOfDay?.length ? editingRule.timesOfDay : DEFAULT_TIMES);
      setNotifyAssignee(editingRule?.notifyAssignee ?? true);
      setNotifyManager(editingRule?.notifyManager ?? true);
      setMeetingAt(toDateTimeInputValue(editingRule?.meetingAt ?? null));
      setMinutesBefore(String(editingRule?.minutesBefore ?? 30));
      setWholeTeam(editingRule?.wholeTeam ?? true);
      setAudienceUserIds(editingRule?.audienceUserIds ?? []);
      setAudienceTeamIds(editingRule?.audienceTeamIds ?? []);
      setViaPush(editingRule?.viaPush ?? true);
      setViaAgentChat(editingRule?.viaAgentChat ?? true);
      setAgentId(editingRule?.agentId ?? agents[0]?.id ?? null);
      setError(null);
    }
  }

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function updateTime(index: number, value: string) {
    setTimesOfDay((current) => current.map((t, i) => (i === index ? value : t)));
  }
  function removeTime(index: number) {
    setTimesOfDay((current) => current.filter((_, i) => i !== index));
  }
  function addTime() {
    setTimesOfDay((current) => [...current, "09:00"]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const meetingAtChanged = kind === "meeting" && editingRule && toDateTimeInputValue(editingRule.meetingAt) !== meetingAt;

    const success = await onSubmit({
      name: name.trim(),
      kind,
      enabled,
      ...(kind === "overdue_escalation"
        ? { timesOfDay: timesOfDay.filter(Boolean), notifyAssignee, notifyManager }
        : {
            meetingAt: fromDateTimeInputValue(meetingAt),
            minutesBefore: Number(minutesBefore) || 30,
            wholeTeam,
            audienceUserIds: wholeTeam ? [] : audienceUserIds,
            audienceTeamIds: wholeTeam ? [] : audienceTeamIds,
          }),
      viaPush,
      viaAgentChat,
      agentId: viaAgentChat ? agentId : null,
      ...(meetingAtChanged && { resetLastRun: true }),
    });
    setSubmitting(false);
    if (success) onClose();
    else setError("Couldn't save this reminder rule.");
  }

  const userOptions = nonAgentUsers.map((u) => ({ value: u.id, label: u.name, icon: <Avatar name={u.name} color={u.color} photoDataUrl={u.photoDataUrl} size="xs" /> }));
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name, icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} /> }));

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-form-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col animate-scale-in rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="reminder-form-title" className="px-5 pt-5 text-base font-semibold text-slate-900 dark:text-slate-100">
          {editingRule ? `Edit ${editingRule.name}` : "New reminder rule"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Name</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={kind === "meeting" ? "e.g. Weekly team sync" : "e.g. Overdue task escalation"}
              required
              className={inputClass}
            />
          </label>

          {!editingRule && (
            <fieldset className="block text-sm">
              <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Type</legend>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    { value: "overdue_escalation" as const, label: "Overdue task escalation", description: "Nudge people about their overdue tasks on a recurring schedule." },
                    { value: "meeting" as const, label: "Meeting reminder", description: "Remind an audience a set number of minutes before a specific date/time." },
                  ]
                ).map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2",
                      kind === option.value ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <input type="radio" name="kind" checked={kind === option.value} onChange={() => setKind(option.value)} className="mt-1" />
                    <span>
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{option.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {kind === "overdue_escalation" ? (
            <>
              <div className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Send at these times each day</span>
                <div className="flex flex-col gap-1.5">
                  {timesOfDay.map((time, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <input type="time" value={time} onChange={(event) => updateTime(index, event.target.value)} className={inputClass} />
                      <button type="button" onClick={() => removeTime(index)} aria-label="Remove time" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTime}
                    className="inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> Add time
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={notifyAssignee} onChange={(event) => setNotifyAssignee(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800" />
                  Notify the assignee
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={notifyManager} onChange={(event) => setNotifyManager(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800" />
                  Also notify their manager(s)
                </label>
              </div>
            </>
          ) : (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Date &amp; time</span>
                <input type="datetime-local" value={meetingAt} onChange={(event) => setMeetingAt(event.target.value)} required className={inputClass} />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Remind this many minutes before</span>
                <input type="number" min={1} value={minutesBefore} onChange={(event) => setMinutesBefore(event.target.value)} required className={inputClass} />
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={wholeTeam} onChange={(event) => setWholeTeam(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800" />
                Notify the whole team
              </label>

              {!wholeTeam && (
                <div className="flex flex-col gap-2">
                  <Menu
                    options={userOptions}
                    value={audienceUserIds}
                    multiple
                    onChange={setAudienceUserIds}
                    ariaLabel="Audience users"
                    renderTrigger={() => (
                      <span className="flex min-h-[34px] w-full flex-wrap items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        {audienceUserIds.length > 0 ? `${audienceUserIds.length} people selected` : "Pick people…"}
                      </span>
                    )}
                  />
                  <Menu
                    options={teamOptions}
                    value={audienceTeamIds}
                    multiple
                    onChange={setAudienceTeamIds}
                    ariaLabel="Audience departments"
                    renderTrigger={() => (
                      <span className="flex min-h-[34px] w-full flex-wrap items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        {audienceTeamIds.length > 0 ? `${audienceTeamIds.length} departments selected` : "Pick departments…"}
                      </span>
                    )}
                  />
                </div>
              )}
            </>
          )}

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Delivery</legend>
            <div className="flex flex-col gap-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={viaPush} onChange={(event) => setViaPush(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800" />
                Push notification
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={viaAgentChat} onChange={(event) => setViaAgentChat(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800" />
                AI agent chat message
              </label>
              {viaAgentChat && (
                <select
                  value={agentId ?? ""}
                  onChange={(event) => setAgentId(event.target.value || null)}
                  disabled={agents.length === 0}
                  className={inputClass}
                >
                  {agents.length === 0 && <option value="">No AI agents yet</option>}
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800" />
            Enabled
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : editingRule ? "Save changes" : "Create rule"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
