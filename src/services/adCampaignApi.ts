import { generateId } from "@/lib/id";
import type { AdCampaign, AdPlatform, CampaignObjective, CampaignStatus } from "@/types/socialMedia";

const STORAGE_KEY = "evotasks.adCampaigns.v1";
const NETWORK_DELAY_MS = 300;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSeedCampaigns(): AdCampaign[] {
  const now = new Date().toISOString();
  const rows: Omit<AdCampaign, "createdAt">[] = [
    {
      id: "adcamp-1",
      projectId: "adproj-lpr",
      name: "Hawk 200R — Vidéo découverte",
      platform: "facebook",
      objective: "video_views",
      status: "active",
      budget: 4000,
      amountSpent: 2380.5,
      results: 18400,
      revenue: 0,
      reach: 210000,
      impressions: 402000,
      clicks: 9600,
    },
    {
      id: "adcamp-2",
      projectId: "adproj-lpr",
      name: "XTANK 200R — Trafic catalogue",
      platform: "instagram",
      objective: "traffic",
      status: "active",
      budget: 3000,
      amountSpent: 1890,
      results: 5200,
      revenue: 0,
      reach: 98000,
      impressions: 176000,
      clicks: 5200,
    },
    {
      id: "adcamp-3",
      projectId: "adproj-lpr",
      name: "Remarketing visiteurs site",
      platform: "google",
      objective: "conversions",
      status: "active",
      budget: 2500,
      amountSpent: 1420.75,
      results: 63,
      revenue: 9840,
      reach: 41000,
      impressions: 88000,
      clicks: 2100,
    },
    {
      id: "adcamp-4",
      projectId: "adproj-atlas",
      name: "Génération leads B2B",
      platform: "google",
      objective: "leads",
      status: "active",
      budget: 5000,
      amountSpent: 3110.2,
      results: 142,
      revenue: 0,
      reach: 76000,
      impressions: 150000,
      clicks: 4300,
    },
    {
      id: "adcamp-5",
      projectId: "adproj-atlas",
      name: "LinkedIn — Décideurs achats",
      platform: "linkedin",
      objective: "leads",
      status: "paused",
      budget: 2000,
      amountSpent: 640,
      results: 21,
      revenue: 0,
      reach: 12000,
      impressions: 21000,
      clicks: 480,
    },
    {
      id: "adcamp-6",
      projectId: "adproj-brand",
      name: "Notoriété — Reels sponsorisés",
      platform: "instagram",
      objective: "awareness",
      status: "completed",
      budget: 5000,
      amountSpent: 4980,
      results: 890000,
      revenue: 0,
      reach: 890000,
      impressions: 1450000,
      clicks: 21000,
    },
  ];
  return rows.map((row) => ({ ...row, createdAt: now }));
}

function readStore(): AdCampaign[] {
  if (typeof window === "undefined") return createSeedCampaigns();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedCampaigns();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as AdCampaign[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedCampaigns();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(campaigns: AdCampaign[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
}

export async function fetchAdCampaigns(projectId: string): Promise<AdCampaign[]> {
  await delay(NETWORK_DELAY_MS);
  return readStore().filter((c) => c.projectId === projectId);
}

export async function fetchAllAdCampaigns(): Promise<AdCampaign[]> {
  await delay(NETWORK_DELAY_MS);
  return readStore();
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
  await delay(NETWORK_DELAY_MS);
  if (!input.name.trim()) throw new ApiError("Campaign name is required.");
  const campaigns = readStore();
  const campaign: AdCampaign = {
    ...input,
    id: generateId("adcamp"),
    name: input.name.trim(),
    createdAt: new Date().toISOString(),
  };
  writeStore([...campaigns, campaign]);
  return campaign;
}

export async function updateAdCampaign(id: string, patch: Partial<Omit<AdCampaign, "id" | "projectId" | "createdAt">>): Promise<AdCampaign> {
  await delay(NETWORK_DELAY_MS);
  const campaigns = readStore();
  const index = campaigns.findIndex((c) => c.id === id);
  if (index === -1) throw new ApiError("Campaign not found.");
  const updated = { ...campaigns[index], ...patch };
  const next = [...campaigns];
  next[index] = updated;
  writeStore(next);
  return updated;
}

export async function deleteAdCampaign(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeStore(readStore().filter((c) => c.id !== id));
}

export async function deleteAdCampaignsByProject(projectId: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeStore(readStore().filter((c) => c.projectId !== projectId));
}
