"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { ROLE_CONFIG, ROLE_ORDER } from "@/config/roleMeta";
import { wouldCreateManagerCycle } from "@/lib/orgChart";
import { randomPaletteColor } from "@/config/colorPalette";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { ImageIcon, XIcon } from "@/components/ui/icons";
import { BASE_NAV_ITEMS } from "@/config/navigation";
import { BUILT_IN_COLUMNS } from "@/components/task-list/ColumnsMenu";
import { ASSIGNED_TO_COLUMN_ID, EXCLUDED_COLUMN_ID } from "@/components/purchases/PurchaseTable";
import { useCustomFields } from "@/hooks/useCustomFields";
import { usePurchaseColumns } from "@/hooks/usePurchaseColumns";
import { uploadFile } from "@/services/uploadApi";
import type { AppUser, Role } from "@/types/user";
import type { Team } from "@/types/team";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
  color: string;
  photoDataUrl: string | null;
  managerIds: string[];
  teamIds: string[];
  visibleSectionHrefs: string[] | null;
  hiddenColumnIds: string[];
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
  const [color, setColor] = useState(randomPaletteColor());
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [visibleSectionHrefs, setVisibleSectionHrefs] = useState<string[]>(BASE_NAV_ITEMS.map((item) => item.href));
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const { fields: customFields } = useCustomFields();
  const { columns: purchaseColumns } = usePurchaseColumns();

  // Reset/prefill the draft whenever the dialog transitions from closed to
  // open, per React's guidance for resetting state when a prop changes.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(editingUser?.name ?? "");
      setEmail(editingUser?.email ?? "");
      setPassword("");
      setRole(editingUser?.role ?? "member");
      setColor(editingUser?.color ?? randomPaletteColor());
      setPhotoDataUrl(editingUser?.photoDataUrl ?? null);
      setPhotoError(null);
      setManagerIds(editingUser?.managerIds ?? []);
      setTeamIds(editingUser ? teamIdsForUser(teams, editingUser.id) : []);
      setVisibleSectionHrefs(editingUser?.visibleSectionHrefs ?? BASE_NAV_ITEMS.map((item) => item.href));
      setHiddenColumnIds(editingUser?.hiddenColumnIds ?? []);
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

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image must be smaller than 2 MB.");
      return;
    }
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      setPhotoDataUrl(await uploadFile(file, "avatars"));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  function toggleTeam(teamId: string) {
    setTeamIds((current) => (current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]));
  }

  function toggleManager(managerId: string) {
    setManagerIds((current) => (current.includes(managerId) ? current.filter((id) => id !== managerId) : [...current, managerId]));
  }

  function toggleSection(href: string) {
    setVisibleSectionHrefs((current) => (current.includes(href) ? current.filter((h) => h !== href) : [...current, href]));
  }

  function toggleHiddenColumn(columnId: string) {
    setHiddenColumnIds((current) => (current.includes(columnId) ? current.filter((id) => id !== columnId) : [...current, columnId]));
  }

  const taskColumns = [...BUILT_IN_COLUMNS, ...customFields.map((f) => ({ id: f.id, label: f.name }))];
  const achatsColumns = [
    { id: ASSIGNED_TO_COLUMN_ID, label: "Assigned to" },
    { id: EXCLUDED_COLUMN_ID, label: "Excluded" },
    ...purchaseColumns.map((c) => ({ id: c.id, label: c.name })),
  ];

  const managerCandidates = users.filter((candidate) => {
    if (editingUser && candidate.id === editingUser.id) return false;
    if (!editingUser) return true;
    return managerIds.includes(candidate.id) || !wouldCreateManagerCycle(users, editingUser.id, candidate.id);
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const normalizedVisibleSectionHrefs = visibleSectionHrefs.length >= BASE_NAV_ITEMS.length ? null : visibleSectionHrefs;
    const success = await onSubmit({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      color,
      photoDataUrl,
      managerIds,
      teamIds,
      visibleSectionHrefs: normalizedVisibleSectionHrefs,
      hiddenColumnIds,
    });
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

          <div className="flex items-center gap-3">
            <Avatar name={name || "?"} color={color} photoDataUrl={photoDataUrl} size="lg" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 aria-disabled:pointer-events-none aria-disabled:opacity-60">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {photoUploading ? "Uploading…" : photoDataUrl ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={photoUploading} className="sr-only" />
                </label>
                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
                <ColorSwatchPicker value={color} onChange={setColor} />
              </div>
              {photoError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{photoError}</p>
              ) : (
                <p className="text-xs text-slate-400">Optional. Falls back to the initial and color.</p>
              )}
            </div>
          </div>

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
              <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Departments (optional)</legend>
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

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Visible sections</legend>
            <p className="mb-1.5 text-xs text-slate-400">Uncheck a section to hide it from this user&apos;s navigation menu.</p>
            <div className="flex max-h-36 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
              {BASE_NAV_ITEMS.map((item) => (
                <label key={item.href} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={visibleSectionHrefs.includes(item.href)}
                    onChange={() => toggleSection(item.href)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Hidden columns</legend>
            <p className="mb-1.5 text-xs text-slate-400">Check a column to hide it from this user in Tasks/Litiges and Achats tables.</p>
            <div className="flex flex-col gap-2">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Tasks &amp; Litiges</p>
                <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
                  {taskColumns.map((column) => (
                    <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={hiddenColumnIds.includes(column.id)}
                        onChange={() => toggleHiddenColumn(column.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Achats</p>
                <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
                  {achatsColumns.map((column) => (
                    <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={hiddenColumnIds.includes(column.id)}
                        onChange={() => toggleHiddenColumn(column.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
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
