"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { ROLE_CONFIG, ROLE_ORDER } from "@/config/roleMeta";
import { wouldCreateManagerCycle } from "@/lib/orgChart";
import { cn } from "@/lib/cn";
import type { AppUser, Role } from "@/types/user";
import type { Team } from "@/types/team";

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7", "#ef4444"];

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
  color: string;
  managerIds: string[];
  teamIds: string[];
}

interface UserFormDialogProps {
  open: boolean;
  editingUser: AppUser | null;
  users: AppUser[];
  teams: Team[];
  onClose: () => void;
  onSubmit: (input: UserFormValues) => Promise<boolean>;
}

function teamIdsForUser(teams: Team[], userId: string): string[] {
  return teams.filter((t) => t.memberIds.includes(userId)).map((t) => t.id);
}

export function UserFormDialog({ open, editingUser, users, teams, onClose, onSubmit }: UserFormDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset/prefill the draft whenever the dialog transitions from closed to
  // open, per React's guidance for resetting state when a prop changes.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(editingUser?.name ?? "");
      setEmail(editingUser?.email ?? "");
      setPassword("");
      setRole(editingUser?.role ?? "member");
      setManagerIds(editingUser?.managerIds ?? []);
      setTeamIds(editingUser ? teamIdsForUser(teams, editingUser.id) : []);
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

  function toggleTeam(teamId: string) {
    setTeamIds((current) => (current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]));
  }

  function toggleManager(managerId: string) {
    setManagerIds((current) => (current.includes(managerId) ? current.filter((id) => id !== managerId) : [...current, managerId]));
  }

  const managerCandidates = users.filter((candidate) => {
    if (editingUser && candidate.id === editingUser.id) return false;
    if (!editingUser) return true;
    return managerIds.includes(candidate.id) || !wouldCreateManagerCycle(users, editingUser.id, candidate.id);
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const color = editingUser?.color ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const success = await onSubmit({ name: name.trim(), email: email.trim(), password, role, color, managerIds, teamIds });
    setSubmitting(false);
    if (success) onClose();
    else setError(editingUser ? "Couldn't save changes. Check the email isn't used by another account." : "Couldn't add this user. Check the email isn't already in use.");
  }

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
        aria-labelledby="user-form-title"
        className="flex max-h-[90vh] w-full max-w-sm flex-col animate-scale-in rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="user-form-title" className="px-5 pt-5 text-base font-semibold text-slate-900 dark:text-slate-100">
          {editingUser ? `Edit ${editingUser.name}` : "Add user"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Full name</span>
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClass} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
              {editingUser ? "Reset password (optional)" : "Temporary password"}
            </span>
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={!editingUser}
              minLength={editingUser && !password ? undefined : 6}
              placeholder={editingUser ? "Leave blank to keep current password" : undefined}
              className={inputClass}
            />
          </label>

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Role</legend>
            <div className="flex flex-col gap-1.5">
              {ROLE_ORDER.map((roleOption) => (
                <label
                  key={roleOption}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2",
                    role === roleOption ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  <input type="radio" name="role" checked={role === roleOption} onChange={() => setRole(roleOption)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{ROLE_CONFIG[roleOption].label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{ROLE_CONFIG[roleOption].description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Managers (optional)</legend>
            <div className="flex max-h-36 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
              {managerCandidates.length === 0 && <p className="px-2 py-1 text-xs text-slate-400">No eligible managers.</p>}
              {managerCandidates.map((candidate) => (
                <label key={candidate.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={managerIds.includes(candidate.id)}
                    onChange={() => toggleManager(candidate.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{candidate.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {teams.length > 0 && (
            <fieldset className="block text-sm">
              <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Teams (optional)</legend>
              <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
                {teams.map((team) => (
                  <label key={team.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={teamIds.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                    />
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="text-sm text-slate-700 dark:text-slate-200">{team.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : editingUser ? "Save changes" : "Add user"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
