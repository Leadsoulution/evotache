"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { ColorSwatchPicker } from "@/components/admin/ColorSwatchPicker";
import { ProjectAvatar } from "./ProjectAvatar";
import { TeamMenu } from "@/components/task-list/TeamMenu";
import { UserExcludeMenu } from "@/components/ui/UserExcludeMenu";
import { randomPaletteColor } from "@/config/colorPalette";
import { ImageIcon, XIcon } from "@/components/ui/icons";
import { uploadFile } from "@/services/uploadApi";
import type { Project } from "@/types/project";
import type { Team } from "@/types/team";
import type { AppUser } from "@/types/user";

interface ProjectDialogProps {
  open: boolean;
  project: Project | null;
  teams: Team[];
  users: AppUser[];
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    description: string;
    color: string;
    logoDataUrl?: string | null;
    teamIds?: string[];
    excludedUserIds?: string[];
  }) => Promise<boolean>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export function ProjectDialog({ open, project, teams, users, onClose, onSubmit }: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(randomPaletteColor());
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the draft whenever the dialog transitions from closed to open (new
  // project or a different one to edit). Done at render time, not in an
  // effect, per React's guidance for resetting state when a prop changes.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
      setColor(project?.color ?? randomPaletteColor());
      setLogoDataUrl(project?.logoDataUrl ?? null);
      setTeamIds(project?.teamIds ?? []);
      setExcludedUserIds(project?.excludedUserIds ?? []);
      setLogoError(null);
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

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Image must be smaller than 2 MB.");
      return;
    }
    setLogoError(null);
    setLogoUploading(true);
    try {
      setLogoDataUrl(await uploadFile(file, "logos"));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const success = await onSubmit({ name: name.trim(), description: description.trim(), color, logoDataUrl, teamIds, excludedUserIds });
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
        aria-labelledby="project-dialog-title"
        className="w-full max-w-sm animate-scale-in rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="project-dialog-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {project ? "Edit project" : "New project"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ColorSwatchPicker value={color} onChange={setColor} />
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} required placeholder="Project name" className={inputClass} />
          </div>

          <div className="flex items-center gap-3">
            <ProjectAvatar project={{ name, color, logoDataUrl }} size="lg" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {logoUploading ? "Uploading…" : logoDataUrl ? "Change logo" : "Upload logo"}
                  <input type="file" accept="image/*" onChange={handleLogoChange} disabled={logoUploading} className="sr-only" />
                </label>
                {logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoDataUrl(null)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
              {logoError && <p className="text-xs text-red-600 dark:text-red-400">{logoError}</p>}
              {!logoError && <p className="text-xs text-slate-400">Optional. Falls back to the color above.</p>}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What is this project about?"
              className={inputClass}
            />
          </label>

          {teams.length > 0 && (
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Departments</span>
              <TeamMenu teams={teams} value={teamIds} onChange={setTeamIds} />
            </div>
          )}

          <div className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Exclude a user</span>
            <UserExcludeMenu users={users} value={excludedUserIds} onChange={setExcludedUserIds} />
            <p className="mt-1 text-xs text-slate-400">Hides this project from that person even if they&apos;d normally see it as a manager.</p>
          </div>

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
              {submitting ? "Saving…" : project ? "Save changes" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
