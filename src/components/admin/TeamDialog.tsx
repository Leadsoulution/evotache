"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { Avatar } from "@/components/ui/Avatar";
import { randomPaletteColor } from "@/config/colorPalette";
import type { Team } from "@/types/team";
import type { AppUser } from "@/types/user";

interface TeamDialogProps {
  open: boolean;
  team: Team | null;
  users: AppUser[];
  onClose: () => void;
  onSubmit: (input: { name: string; color: string; memberIds: string[] }) => Promise<boolean>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export function TeamDialog({ open, team, users, onClose, onSubmit }: TeamDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(randomPaletteColor());
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the draft whenever the dialog transitions from closed to open, per
  // React's guidance for resetting state when a prop changes (render-time, not effect).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(team?.name ?? "");
      setColor(team?.color ?? randomPaletteColor());
      setMemberIds(team?.memberIds ?? []);
    }
  }

  if (!open) return null;

  function toggleMember(userId: string) {
    setMemberIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const success = await onSubmit({ name: name.trim(), color, memberIds });
    setSubmitting(false);
    if (success) onClose();
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
        aria-labelledby="team-dialog-title"
        className="w-full max-w-sm animate-scale-in rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="team-dialog-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {team ? "Edit team" : "New team"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ColorSwatchPicker value={color} onChange={setColor} />
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} required placeholder="Team name" className={inputClass} />
          </div>

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Members</legend>
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
              {users.length === 0 && <p className="px-2 py-1 text-xs text-slate-400">No users yet.</p>}
              {users.map((candidate) => (
                <label
                  key={candidate.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={memberIds.includes(candidate.id)}
                    onChange={() => toggleMember(candidate.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <Avatar name={candidate.name} color={candidate.color} size="xs" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{candidate.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

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
              disabled={submitting || !name.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : team ? "Save changes" : "Create team"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
