"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Menu } from "@/components/ui/Menu";
import { ChevronDownIcon } from "@/components/ui/icons";
import { toDateInputValue, fromDateInputValue } from "@/lib/date";
import { PLATFORM_META, PLATFORM_ORDER, AD_PROJECT_STATUS_META, AD_PROJECT_STATUS_ORDER } from "@/config/socialMeta";
import type { AdPlatform, AdProject, AdProjectStatus } from "@/types/socialMedia";

export interface AdProjectFormValues {
  name: string;
  client: string;
  platform: AdPlatform;
  status: AdProjectStatus;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
  metaAdAccountId?: string | null;
}

interface MetaAdAccountOption {
  id: string;
  name: string;
}

interface AdProjectDialogProps {
  open: boolean;
  project: AdProject | null;
  onClose: () => void;
  onSubmit: (input: AdProjectFormValues) => Promise<boolean>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export function AdProjectDialog({ open, project, onClose, onSubmit }: AdProjectDialogProps) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [platform, setPlatform] = useState<AdPlatform>("facebook");
  const [status, setStatus] = useState<AdProjectStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [metaAdAccountId, setMetaAdAccountId] = useState<string | null>(null);
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAdAccountOption[] | null>(null);
  const [metaAdAccountsError, setMetaAdAccountsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(project?.name ?? "");
      setClient(project?.client ?? "");
      setPlatform(project?.platform ?? "facebook");
      setStatus(project?.status ?? "active");
      setStartDate(toDateInputValue(project?.startDate ?? null));
      setEndDate(toDateInputValue(project?.endDate ?? null));
      setTotalBudget(project ? String(project.totalBudget) : "");
      setMetaAdAccountId(project?.metaAdAccountId ?? null);
    }
  }

  // A non-ok response (e.g. a 403 for a role without workflow:manage) still
  // parses as JSON — `{ error: "Forbidden" }` — so it must be checked
  // explicitly, not just coerced to an empty array. Without that check this
  // silently rendered "no accounts to link" with zero indication anything
  // went wrong, indistinguishable from Meta genuinely not being connected.
  useEffect(() => {
    if (!open) return;
    fetch("/api/integrations/meta/status")
      .then((res) => res.json())
      .then((status: { connected: boolean }) => {
        if (!status.connected) return;
        return fetch("/api/integrations/meta/ad-accounts").then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            setMetaAdAccountsError(data?.error ?? "Failed to load Meta ad accounts.");
            return;
          }
          setMetaAdAccounts(Array.isArray(data) ? data : []);
        });
      })
      .catch(() => setMetaAdAccountsError("Failed to load Meta ad accounts."));
  }, [open]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const success = await onSubmit({
      name: name.trim(),
      client: client.trim(),
      platform,
      status,
      startDate: fromDateInputValue(startDate),
      endDate: fromDateInputValue(endDate),
      totalBudget: Number(totalBudget) || 0,
      metaAdAccountId,
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
        aria-labelledby="ad-project-dialog-title"
        className="w-full max-w-md animate-scale-in rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="ad-project-dialog-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {project ? "Edit ad project" : "New ad project"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Project name</span>
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Hawk 200R Launch" className={inputClass} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Client</span>
            <input value={client} onChange={(event) => setClient(event.target.value)} required placeholder="Client name" className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Platform</span>
              <Menu
                options={PLATFORM_ORDER.map((p) => ({ value: p, label: PLATFORM_META[p].label, dotColor: undefined }))}
                value={[platform]}
                onChange={(next) => setPlatform(next[0] as AdPlatform)}
                ariaLabel="Platform"
                renderTrigger={({ open: menuOpen }) => (
                  <span
                    className={cnTrigger(menuOpen)}
                    style={{ backgroundColor: `${PLATFORM_META[platform].color}22`, color: PLATFORM_META[platform].color }}
                  >
                    {PLATFORM_META[platform].label}
                    <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
                  </span>
                )}
              />
            </div>
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Status</span>
              <Menu
                options={AD_PROJECT_STATUS_ORDER.map((s) => ({ value: s, label: AD_PROJECT_STATUS_META[s].label }))}
                value={[status]}
                onChange={(next) => setStatus(next[0] as AdProjectStatus)}
                ariaLabel="Status"
                renderTrigger={({ open: menuOpen }) => (
                  <span
                    className={cnTrigger(menuOpen)}
                    style={{ backgroundColor: `${AD_PROJECT_STATUS_META[status].color}22`, color: AD_PROJECT_STATUS_META[status].color }}
                  >
                    {AD_PROJECT_STATUS_META[status].label}
                    <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
                  </span>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Start date</span>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">End date</span>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Total budget ($)</span>
            <input type="number" min="0" step="0.01" value={totalBudget} onChange={(event) => setTotalBudget(event.target.value)} placeholder="0.00" className={inputClass} />
          </label>

          {metaAdAccountsError && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Couldn&apos;t load Meta ad accounts: {metaAdAccountsError}
            </p>
          )}

          {metaAdAccounts && metaAdAccounts.length > 0 && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Linked Meta ad account</span>
              <select value={metaAdAccountId ?? ""} onChange={(event) => setMetaAdAccountId(event.target.value || null)} className={inputClass}>
                <option value="">None — manual campaign entry</option>
                {metaAdAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-400">When linked, this project&apos;s campaigns sync automatically from Meta instead of being entered by hand.</span>
            </label>
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

function cnTrigger(open: boolean): string {
  return [
    "inline-flex w-full items-center justify-between gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-shadow",
    open ? "ring-2 ring-indigo-400" : "",
  ].join(" ");
}
