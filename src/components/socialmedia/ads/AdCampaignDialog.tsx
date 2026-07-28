"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Menu } from "@/components/ui/Menu";
import { ChevronDownIcon } from "@/components/ui/icons";
import { PLATFORM_META, PLATFORM_ORDER, CAMPAIGN_OBJECTIVE_META, CAMPAIGN_OBJECTIVE_ORDER, CAMPAIGN_STATUS_META, CAMPAIGN_STATUS_ORDER } from "@/config/socialMeta";
import type { AdCampaign, AdPlatform, CampaignObjective, CampaignStatus } from "@/types/socialMedia";

export interface AdCampaignFormValues {
  name: string;
  platform: AdPlatform;
  objective: CampaignObjective;
  status: CampaignStatus;
  budget: number;
  amountSpent: number;
  results: number;
  revenue: number;
  reach: number;
  impressions: number;
  clicks: number;
}

interface AdCampaignDialogProps {
  open: boolean;
  campaign: AdCampaign | null;
  onClose: () => void;
  onSubmit: (input: AdCampaignFormValues) => Promise<boolean>;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

function fieldState(initial = "") {
  return initial;
}

export function AdCampaignDialog({ open, campaign, onClose, onSubmit }: AdCampaignDialogProps) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<AdPlatform>("facebook");
  const [objective, setObjective] = useState<CampaignObjective>("traffic");
  const [status, setStatus] = useState<CampaignStatus>("draft");
  const [budget, setBudget] = useState("");
  const [amountSpent, setAmountSpent] = useState("");
  const [results, setResults] = useState("");
  const [revenue, setRevenue] = useState("");
  const [reach, setReach] = useState("");
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(campaign?.name ?? "");
      setPlatform(campaign?.platform ?? "facebook");
      setObjective(campaign?.objective ?? "traffic");
      setStatus(campaign?.status ?? "draft");
      setBudget(fieldState(campaign ? String(campaign.budget) : ""));
      setAmountSpent(fieldState(campaign ? String(campaign.amountSpent) : ""));
      setResults(fieldState(campaign ? String(campaign.results) : ""));
      setRevenue(fieldState(campaign ? String(campaign.revenue) : ""));
      setReach(fieldState(campaign ? String(campaign.reach) : ""));
      setImpressions(fieldState(campaign ? String(campaign.impressions) : ""));
      setClicks(fieldState(campaign ? String(campaign.clicks) : ""));
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const success = await onSubmit({
      name: name.trim(),
      platform,
      objective,
      status,
      budget: Number(budget) || 0,
      amountSpent: Number(amountSpent) || 0,
      results: Number(results) || 0,
      revenue: Number(revenue) || 0,
      reach: Number(reach) || 0,
      impressions: Number(impressions) || 0,
      clicks: Number(clicks) || 0,
    });
    setSubmitting(false);
    if (success) onClose();
  }

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
        aria-labelledby="ad-campaign-dialog-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col animate-scale-in rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="ad-campaign-dialog-title" className="px-5 pt-5 text-base font-semibold text-slate-900 dark:text-slate-100">
          {campaign ? "Edit campaign" : "New campaign"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Campaign name</span>
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Retargeting — Website visitors" className={inputClass} />
          </label>

          <div className="grid grid-cols-3 gap-3">
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
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Objective</span>
              <Menu
                options={CAMPAIGN_OBJECTIVE_ORDER.map((o) => ({ value: o, label: CAMPAIGN_OBJECTIVE_META[o].label }))}
                value={[objective]}
                onChange={(next) => setObjective(next[0] as CampaignObjective)}
                ariaLabel="Objective"
                renderTrigger={({ open: menuOpen }) => pillTrigger(menuOpen, CAMPAIGN_OBJECTIVE_META[objective].label, CAMPAIGN_OBJECTIVE_META[objective].color)}
              />
            </div>
            <div className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Status</span>
              <Menu
                options={CAMPAIGN_STATUS_ORDER.map((s) => ({ value: s, label: CAMPAIGN_STATUS_META[s].label }))}
                value={[status]}
                onChange={(next) => setStatus(next[0] as CampaignStatus)}
                ariaLabel="Status"
                renderTrigger={({ open: menuOpen }) => pillTrigger(menuOpen, CAMPAIGN_STATUS_META[status].label, CAMPAIGN_STATUS_META[status].color)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Budget ($)</span>
              <input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Amount spent ($)</span>
              <input type="number" min="0" step="0.01" value={amountSpent} onChange={(event) => setAmountSpent(event.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Results</span>
              <input type="number" min="0" value={results} onChange={(event) => setResults(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Revenue ($, for ROAS)</span>
              <input type="number" min="0" step="0.01" value={revenue} onChange={(event) => setRevenue(event.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Reach</span>
              <input type="number" min="0" value={reach} onChange={(event) => setReach(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Impressions</span>
              <input type="number" min="0" value={impressions} onChange={(event) => setImpressions(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Clicks</span>
              <input type="number" min="0" value={clicks} onChange={(event) => setClicks(event.target.value)} className={inputClass} />
            </label>
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
              {submitting ? "Saving…" : campaign ? "Save changes" : "Create campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
