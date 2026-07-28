"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageIcon, PlusIcon, UsersIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Conversation } from "@/types/chat";
import type { AppUser } from "@/types/user";

interface GroupInfoPanelProps {
  open: boolean;
  conversation: Conversation | null;
  users: AppUser[];
  currentUserId: string;
  onClose: () => void;
  onRename: (name: string) => void;
  onUpdateAvatar: (avatarDataUrl: string | null) => void;
  onAddMembers: (userIds: string[]) => void;
  onRemoveMember: (userId: string) => void;
  onLeave: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function GroupInfoPanel({ open, conversation, users, currentUserId, onClose, onRename, onUpdateAvatar, onAddMembers, onRemoveMember, onLeave }: GroupInfoPanelProps) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset the draft whenever the panel transitions from closed to open, at
  // render time — same pattern used by the dialogs elsewhere in this app.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setName(conversation?.name ?? "");
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !conversation) return null;

  const isOwner = conversation.createdBy === currentUserId;
  const members = conversation.participantIds.map((id) => users.find((u) => u.id === id)).filter((u): u is AppUser => Boolean(u));
  const nonMembers = users.filter((u) => !conversation.participantIds.includes(u.id));
  const removingUser = pendingRemoveId ? users.find((u) => u.id === pendingRemoveId) : null;

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    onUpdateAvatar(await readFileAsDataUrl(file));
  }

  return createPortal(
    <div className="fixed inset-0 z-[85] flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-full animate-slide-up flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl sm:max-w-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Group info</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-4 py-6">
          <div className="relative">
            {conversation.avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={conversation.avatarDataUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <UsersIcon className="h-8 w-8" />
              </span>
            )}
            {isOwner && (
              <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white">
                <ImageIcon className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
              </label>
            )}
          </div>

          {isOwner ? (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => name.trim() && name !== conversation.name && onRename(name)}
              className="w-full rounded-lg border border-transparent px-2 py-1 text-center text-base font-semibold text-slate-900 hover:border-slate-200 focus:border-indigo-400 focus:outline-none dark:text-slate-100 dark:hover:border-slate-700"
            />
          ) : (
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{conversation.name}</p>
          )}
          <p className="text-xs text-slate-400">{members.length} members</p>
        </div>

        <div className="flex-1 px-4 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>
            {isOwner && (
              <button
                type="button"
                onClick={() => setAdding((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add
              </button>
            )}
          </div>

          {adding && (
            <div className="mb-3 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
              {nonMembers.length === 0 && <p className="px-2 py-1 text-xs text-slate-400">Everyone is already in this group.</p>}
              {nonMembers.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => {
                    onAddMembers([candidate.id]);
                    setAdding(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Avatar name={candidate.name} color={candidate.color} photoDataUrl={candidate.photoDataUrl} size="xs" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{candidate.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1">
            {members.map((member) => (
              <div key={member.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                <Avatar name={member.name} color={member.color} photoDataUrl={member.photoDataUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-700 dark:text-slate-200">
                    {member.name}
                    {member.id === conversation.createdBy && <span className="ml-1.5 text-xs text-slate-400">(owner)</span>}
                    {member.id === currentUserId && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                  </span>
                </span>
                {isOwner && member.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => setPendingRemoveId(member.id)}
                    className={cn("rounded-md p-1 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950 dark:hover:text-red-400")}
                    aria-label={`Remove ${member.name}`}
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setPendingLeave(true)}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            Leave group
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={pendingLeave}
        title="Leave this group?"
        description="You won't see new messages from this group until someone adds you back."
        confirmLabel="Leave"
        destructive
        onConfirm={() => {
          setPendingLeave(false);
          onLeave();
        }}
        onCancel={() => setPendingLeave(false)}
      />

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove this member?"
        description={removingUser ? `"${removingUser.name}" will no longer see this group.` : ""}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (pendingRemoveId) onRemoveMember(pendingRemoveId);
          setPendingRemoveId(null);
        }}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>,
    document.body
  );
}
