"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Menu } from "@/components/ui/Menu";
import { ContentAssigneeMenu } from "./ContentAssigneeMenu";
import { normalizeUrl } from "./ContentLinkField";
import { ChevronDownIcon } from "@/components/ui/icons";
import { toDateInputValue, fromDateInputValue } from "@/lib/date";
import { REEL_EDITING_STATUS_META, REEL_EDITING_STATUS_ORDER, APPROVAL_STATUS_META, CONTENT_PRIORITY_META, CONTENT_PRIORITY_ORDER } from "@/config/socialMeta";
import type { ApprovalStatus, ContentPriority, Reel, ReelEditingStatus } from "@/types/socialMedia";
import type { AppUser } from "@/types/user";

export interface ReelFormValues {
  title: string;
  client: string;
  assigneeId: string | null;
  script: string;
  shootingDate: string | null;
  editingStatus: ReelEditingStatus;
  approvalStatus: ApprovalStatus;
  publishingDate: string | null;
  priority: ContentPriority;
  notes: string;
  link: string | null;
}

interface ReelDialogProps {
  open: boolean;
  reel: Reel | null;
  defaultEditingStatus: ReelEditingStatus | null;
  users: AppUser[];
  onClose: () => void;
  onSubmit: (input: ReelFormValues) => Promise<boolean>;
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

export function ReelDialog({ open, reel, defaultEditingStatus, users, onClose, onSubmit }: ReelDialogProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [shootingDate, setShootingDate] = useState("");
  const [editingStatus, setEditingStatus] = useState<ReelEditingStatus>("not_started");
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("pending");
  const [publishingDate, setPublishingDate] = useState("");
  const [priority, setPriority] = useState<ContentPriority>("normal");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(reel?.title ?? "");
      setClient(reel?.client ?? "");
      setAssigneeId(reel?.assigneeId ?? null);
      setScript(reel?.script ?? "");
      setShootingDate(toDateInputValue(reel?.shootingDate ?? null));
      setEditingStatus(reel?.editingStatus ?? defaultEditingStatus ?? "not_started");
      setApprovalStatus(reel?.approvalStatus ?? "pending");
      setPublishingDate(toDateInputValue(reel?.publishingDate ?? null));
      setPriority(reel?.priority ?? "normal");
      setNotes(reel?.notes ?? "");
      setLink(reel?.link ?? "");
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
      assigneeId,
      script,
      shootingDate: fromDateInputValue(shootingDate),
      editingStatus,
      approvalStatus,
      publishingDate: fromDateInputValue(publishingDate),
      priority,
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
        aria-labelledby="reel-dialog-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col animate-scale-in rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="reel-dialog-title" className="px-5 pt-5 text-base font-semibold text-slate-900 dark:text-slate-100">
          {reel ? "Edit reel" : "New reel"}
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
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Assigned to</span>
              <div className="flex h-[38px] items-center rounded-lg border border-slate-200 px-2.5 dark:border-slate-700">
                <ContentAssigneeMenu users={users} value={assigneeId} onChange={setAssigneeId} />
              </div>
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Script</span>
            <textarea value={script} onChange={(event) => setScript(event.target.value)} rows={3} className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Shooting date</span>
              <input type="date" value={shootingDate} onChange={(event) => setShootingDate(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Publishing date</span>
              <input type="date" value={publishingDate} onChange={(event) => setPublishingDate(event.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Editing</span>
              <Menu
                options={REEL_EDITING_STATUS_ORDER.map((s) => ({ value: s, label: REEL_EDITING_STATUS_META[s].label }))}
                value={[editingStatus]}
                onChange={(next) => setEditingStatus(next[0] as ReelEditingStatus)}
                ariaLabel="Editing status"
                renderTrigger={({ open: menuOpen }) => pillTrigger(menuOpen, REEL_EDITING_STATUS_META[editingStatus].label, REEL_EDITING_STATUS_META[editingStatus].color)}
              />
            </div>
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Approval</span>
              <Menu
                options={(Object.keys(APPROVAL_STATUS_META) as ApprovalStatus[]).map((s) => ({ value: s, label: APPROVAL_STATUS_META[s].label }))}
                value={[approvalStatus]}
                onChange={(next) => setApprovalStatus(next[0] as ApprovalStatus)}
                ariaLabel="Approval status"
                renderTrigger={({ open: menuOpen }) => pillTrigger(menuOpen, APPROVAL_STATUS_META[approvalStatus].label, APPROVAL_STATUS_META[approvalStatus].color)}
              />
            </div>
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Priority</span>
              <Menu
                options={CONTENT_PRIORITY_ORDER.map((p) => ({ value: p, label: CONTENT_PRIORITY_META[p].label }))}
                value={[priority]}
                onChange={(next) => setPriority(next[0] as ContentPriority)}
                ariaLabel="Priority"
                renderTrigger={({ open: menuOpen }) => pillTrigger(menuOpen, CONTENT_PRIORITY_META[priority].label, CONTENT_PRIORITY_META[priority].color)}
              />
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
              {submitting ? "Saving…" : reel ? "Save changes" : "Create reel"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
