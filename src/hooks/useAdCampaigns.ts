"use client";

import { useCallback, useEffect, useState } from "react";
import { createAdCampaign, deleteAdCampaign, fetchAdCampaigns, updateAdCampaign } from "@/services/adCampaignApi";
import { useToast } from "@/components/ui/Toast";
import type { AdCampaign, AdPlatform, CampaignObjective, CampaignStatus } from "@/types/socialMedia";

type LoadState = "loading" | "success" | "error";

interface AdCampaignInput {
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

export function useAdCampaigns(projectId: string) {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchAdCampaigns(projectId)
      .then((list) => {
        if (cancelled) return;
        setCampaigns(list);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const addCampaign = useCallback(
    async (input: AdCampaignInput) => {
      try {
        const created = await createAdCampaign({ ...input, projectId });
        setCampaigns((current) => [...current, created]);
        toast.success(`${created.name} was created.`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create the campaign.");
        return false;
      }
    },
    [projectId, toast]
  );

  const editCampaign = useCallback(
    async (id: string, patch: Partial<AdCampaignInput>) => {
      const previous = campaigns;
      setCampaigns((current) => current.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      try {
        await updateAdCampaign(id, patch);
      } catch (err) {
        setCampaigns(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update the campaign.");
      }
    },
    [campaigns, toast]
  );

  const removeCampaign = useCallback(
    async (id: string) => {
      const previous = campaigns;
      setCampaigns((current) => current.filter((c) => c.id !== id));
      try {
        await deleteAdCampaign(id);
      } catch (err) {
        setCampaigns(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete the campaign.");
      }
    },
    [campaigns, toast]
  );

  return { campaigns, loadState, addCampaign, editCampaign, removeCampaign };
}
