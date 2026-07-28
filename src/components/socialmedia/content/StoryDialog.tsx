"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Menu } from "@/components/ui/Menu";
import { ContentAssigneeMenu } from "./ContentAssigneeMenu";
import { normalizeUrl } from "./ContentLinkField";
import { ChevronDownIcon } from "@/components/ui/icons";
import { toDateInputValue, fromDateInputValue } from "@/lib/date";
import { CONTENT_STAGE_STATUS_META, CONTENT_STAGE_STATUS_ORDER, PLATFORM_META, PLATFORM_ORDER } from "@/config/socialMeta";
import type { AdPlatform, ContentStageStatus, Story } from "@/types/socialMedia";
import type { AppUser } from "@/types/user";

export interface StoryFormValues {
  title: string;
  client: string;
  platform: AdPlatform;
  dueDate: string | null;
  status: ContentStageStatus;
  assigneeId: string | null;
  notes: string;
  link: string | null;
}

interface StoryDialogProps {
  open: boolean;
  story: Story | null;
  defaultStatus: ContentStageStatus | null;
  /** Prefills the title for a brand-new story (e.g. launched from a dead-stock product) — ignored once `story` is set. */
  initialTitle?: string;
  initialNotes?: string;
  users: AppUser[];
  onClose: () => void;
  onSubmit: (input: StoryFormValues) => Promise<boolean>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

function pillTrigger(open: boolean, label: string, color: string) {
  return (
    <span
      className={`inline-flex w-full items-center justify-between gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-shadow ${open ? "ring-2 ring-indigo-400" : ""}`}
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
      <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
    </span>
  );
}

export function StoryDialog({ open, story, defaultStatus, initialTitle, initialNotes, users, onClose, onSubmit }: StoryDialogProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [platform, setPlatform] = useState<AdPlatform>("instagram");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<ContentStageStatus>("draft");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(story?.title ?? initialTitle ?? "");
      setClient(story?.client ?? "");
      setPlatform(story?.platform ?? "instagram");
      setDueDate(toDateInputValue(story?.dueDate ?? null));
      setStatus(story?.status ?? defaultStatus ?? "draft");
      setAssigneeId(story?.assigneeId ?? null);
      setNotes(story?.notes ?? initialNotes ?? "");
      setLink(story?.link ?? "");
    }
  }

  useEffect(() => {
    if (open) titleRef.current?.focus();
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const success = await onSubmit({
      title: title.trim(),
      client: client.trim(),
      platform,
      dueDate: fromDateInputValue(dueDate),
      status,
      assigneeId,
      notes,
      link: normalizeUrl(link),
    });
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
        aria-labelledby="story-dialog-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col animate-scale-in rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="story-dialog-title" className="px-5 pt-5 text-base font-semibold text-slate-900 dark:text-slate-100">
          {story ? "Edit story" : "New story"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Title</span>
            <input ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} required className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Client</span>
              <input value={client} onChange={(event) => setClient(event.target.value)} className={inputClass} />
            </label>
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Platform</span>
              <Menu
                options={PLATFORM_ORDER.map((p) => ({ value: p, label: PLATFORM_META[p].label }))}
                value={[platform]}
                onChange={(next) => setPlatform(next[0] as AdPlatform)}
                ariaLabel="Platform"
                renderTrigger={({ open: menuOpen }) => pillTrigger(menuOpen, PLATFORM_META[platform].label, PLATFORM_META[platform].color)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Due date</span>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
            </label>
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Status</span>
              <Menu
                options={CONTENT_STAGE_STATUS_ORDER.map((s) => ({ value: s, label: CONTENT_STAGE_STATUS_META[s].label }))}
                value={[status]}
                onChange={(next) => setStatus(next[0] as ContentStageStatus)}
                ariaLabel="Status"
                renderTrigger={({ open: menuOpen }) => pillTrigger(menuOpen, CONTENT_STAGE_STATUS_META[status].label, CONTENT_STAGE_STATUS_META[status].color)}
              />
            </div>
          </div>

          <div className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Assigned to</span>
            <div className="flex h-[38px] items-center rounded-lg border border-slate-200 px-2.5 dark:border-slate-700">
              <ContentAssigneeMenu users={users} value={assigneeId} onChange={setAssigneeId} />
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className={inputClass} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Link to published post</span>
            <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" className={inputClass} />
          </label>

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
              disabled={submitting || !title.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : story ? "Save changes" : "Create story"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
