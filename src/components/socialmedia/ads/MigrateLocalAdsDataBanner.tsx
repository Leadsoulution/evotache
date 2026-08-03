"use client";

import { useEffect, useState } from "react";
import { createAdProject } from "@/services/adProjectApi";
import { createAdCampaign } from "@/services/adCampaignApi";
import { useToast } from "@/components/ui/Toast";
import { UploadIcon, XIcon } from "@/components/ui/icons";
import type { AdCampaign, AdProject } from "@/types/socialMedia";

const PROJECTS_KEY = "evotasks.adProjects.v1";
const CAMPAIGNS_KEY = "evotasks.adCampaigns.v1";
const DISMISSED_KEY = "evotasks.adsMigrationDismissed";

function readLegacy<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function MigrateLocalAdsDataBanner() {
  const [visible, setVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (window.localStorage.getItem(DISMISSED_KEY)) return;
    const hasData = readLegacy<AdProject>(PROJECTS_KEY).length > 0 || readLegacy<AdCampaign>(CAMPAIGNS_KEY).length > 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(hasData);
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const legacyProjects = readLegacy<AdProject>(PROJECTS_KEY);
      const legacyCampaigns = readLegacy<AdCampaign>(CAMPAIGNS_KEY);

      // The server assigns its own ids, so campaigns need their projectId
      // remapped from the old browser-local id to the new server id.
      const idMap = new Map<string, string>();
      for (const project of legacyProjects) {
        const created = await createAdProject({
          name: project.name,
          client: project.client,
          platform: project.platform,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          totalBudget: project.totalBudget,
        });
        idMap.set(project.id, created.id);
      }

      let importedCampaigns = 0;
      for (const campaign of legacyCampaigns) {
        const newProjectId = idMap.get(campaign.projectId);
        if (!newProjectId) continue; // orphaned campaign with no matching project — skip
        await createAdCampaign({
          projectId: newProjectId,
          name: campaign.name,
          platform: campaign.platform,
          objective: campaign.objective,
          status: campaign.status,
          budget: campaign.budget,
          amountSpent: campaign.amountSpent,
          results: campaign.results,
          revenue: campaign.revenue,
          reach: campaign.reach,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
        });
        importedCampaigns++;
      }

      window.localStorage.removeItem(PROJECTS_KEY);
      window.localStorage.removeItem(CAMPAIGNS_KEY);
      window.localStorage.removeItem(DISMISSED_KEY);
      toast.success(`Imported ${legacyProjects.length} project(s) and ${importedCampaigns} campaign(s).`);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import — try again.");
      setImporting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950">
      <UploadIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-amber-800 dark:text-amber-200">
        We found ad campaign data saved in this browser only — it won&apos;t appear on other devices until you import it to the server.
      </p>
      <button
        type="button"
        onClick={handleImport}
        disabled={importing}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {importing ? "Importing…" : "Import my data"}
      </button>
      <button
        type="button"
        onClick={dismiss}
        disabled={importing}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100 disabled:cursor-not-allowed dark:text-amber-400 dark:hover:bg-amber-900"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
