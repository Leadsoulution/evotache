import type { AdCampaign, AdPlatform, CampaignObjective, CampaignStatus } from "@/types/socialMedia";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchAdCampaigns(projectId: string): Promise<AdCampaign[]> {
  const response = await fetch(`/api/social/ad-campaigns?projectId=${projectId}`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchAllAdCampaigns(): Promise<AdCampaign[]> {
  const response = await fetch("/api/social/ad-campaigns");
  if (!response.ok) return [];
  return response.json();
}

interface CreateAdCampaignInput {
  projectId: string;
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

export async function createAdCampaign(input: CreateAdCampaignInput): Promise<AdCampaign> {
  if (!input.name.trim()) throw new ApiError("Campaign name is required.");
  const response = await fetch("/api/social/ad-campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateAdCampaign(id: string, patch: Partial<Omit<AdCampaign, "id" | "projectId" | "createdAt">>): Promise<AdCampaign> {
  const response = await fetch(`/api/social/ad-campaigns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteAdCampaign(id: string): Promise<void> {
  const response = await fetch(`/api/social/ad-campaigns/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function deleteAdCampaignsByProject(projectId: string): Promise<void> {
  const response = await fetch(`/api/social/ad-campaigns?projectId=${projectId}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
