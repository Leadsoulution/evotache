"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { CheckIcon, ImageIcon, SearchIcon, UsersIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { AppUser } from "@/types/user";
import type { Conversation } from "@/types/chat";

interface NewConversationDialogProps {
  open: boolean;
  users: AppUser[];
  currentUserId: string;
  onClose: () => void;
  onStartDirect: (userId: string) => Promise<Conversation | null>;
  onStartGroup: (input: { name: string; participantIds: string[]; avatarDataUrl: string | null }) => Promise<Conversation | null>;
  onCreated: (conversation: Conversation) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export function NewConversationDialog({ open, users, currentUserId, onClose, onStartDirect, onStartGroup, onCreated }: NewConversationDialogProps) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMode("direct");
      setSearch("");
      setSelectedIds([]);
      setGroupName("");
      setGroupAvatar(null);
    }
  }

  if (!open) return null;

  const candidates = users.filter((u) => u.id !== currentUserId && u.name.toLowerCase().includes(search.trim().toLowerCase()));

  function toggleSelected(userId: string) {
    setSelectedIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  async function handlePickDirect(userId: string) {
    setSubmitting(true);
    const conversation = await onStartDirect(userId);
    setSubmitting(false);
    if (conversation) {
      onCreated(conversation);
      onClose();
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setGroupAvatar(await readFileAsDataUrl(file));
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupName.trim() || selectedIds.length === 0) return;
    setSubmitting(true);
    const conversation = await onStartGroup({ name: groupName, participantIds: selectedIds, avatarDataUrl: groupAvatar });
    setSubmitting(false);
    if (conversation) {
      onCreated(conversation);
      onClose();
    }
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
        aria-labelledby="new-conversation-title"
        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 id="new-conversation-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {mode === "direct" ? "New chat" : "New group"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-3 pt-2 dark:border-slate-800">
          {(["direct", "group"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-t-lg px-3 py-1.5 text-sm font-medium",
                mode === m ? "border-b-2 border-indigo-600 text-indigo-700 dark:text-indigo-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              {m === "direct" ? "Message" : "Group"}
            </button>
          ))}
        </div>

        {mode === "group" && (
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="relative">
              {groupAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={groupAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <UsersIcon className="h-5 w-5" />
                </span>
              )}
              <label className="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white">
                <ImageIcon className="h-3 w-3" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
              </label>
            </div>
            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" className={inputClass} />
          </div>
        )}

        <label className="relative mx-4 mt-3 block">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
          />
        </label>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {candidates.length === 0 && <p className="px-2 py-4 text-center text-sm text-slate-400">No one found.</p>}
          {candidates.map((candidate) => {
            const selected = selectedIds.includes(candidate.id);
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => (mode === "direct" ? handlePickDirect(candidate.id) : toggleSelected(candidate.id))}
                disabled={submitting}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800"
              >
                <Avatar name={candidate.name} color={candidate.color} photoDataUrl={candidate.photoDataUrl} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{candidate.name}</span>
                  <span className="block truncate text-xs text-slate-400">{candidate.email}</span>
                </span>
                {mode === "group" && (
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600"
                    )}
                  >
                    {selected && <CheckIcon className="h-3 w-3" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {mode === "group" && (
          <form onSubmit={handleCreateGroup} className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting || !groupName.trim() || selectedIds.length === 0}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : `Create group${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
