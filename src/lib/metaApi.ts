import { getValidAccessToken } from "@/lib/metaAuth";
import { DEFAULT_META_DATE_PRESET } from "@/config/metaAds";
import type { MetaDatePreset } from "@/config/metaAds";
import type { CampaignObjective, CampaignStatus } from "@/types/socialMedia";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function metaFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const accessToken = await getValidAccessToken();
  const query = new URLSearchParams({ ...params, access_token: accessToken });
  const response = await fetch(`${GRAPH_BASE}${path}?${query.toString()}`);
  if (!response.ok) throw new Error(`Meta API request failed (${response.status}): ${await response.text()}`);
  return response.json();
}

export interface MetaAdAccount {
  id: string; // already prefixed "act_..." — use directly in campaign/insights calls
  name: string;
  accountStatus: number;
}

export async function listAdAccounts(): Promise<MetaAdAccount[]> {
  const data = (await metaFetch("/me/adaccounts", { fields: "id,name,account_status" })) as {
    data: { id: string; name: string; account_status: number }[];
  };
  return (data.data ?? []).map((a) => ({ id: a.id, name: a.name, accountStatus: a.account_status }));
}

// Meta's objective strings span both legacy (LINK_CLICKS, CONVERSIONS, ...)
// and current outcome-driven (OUTCOME_TRAFFIC, ...) naming — mapped onto
// this app's existing CampaignObjective union with a safe fallback for
// anything unrecognized rather than throwing.
const META_OBJECTIVE_MAP: Record<string, CampaignObjective> = {
  OUTCOME_AWARENESS: "awareness",
  BRAND_AWARENESS: "awareness",
  REACH: "awareness",
  OUTCOME_TRAFFIC: "traffic",
  LINK_CLICKS: "traffic",
  OUTCOME_ENGAGEMENT: "engagement",
  POST_ENGAGEMENT: "engagement",
  PAGE_LIKES: "engagement",
  MESSAGES: "engagement",
  OUTCOME_LEADS: "leads",
  LEAD_GENERATION: "leads",
  OUTCOME_SALES: "conversions",
  CONVERSIONS: "conversions",
  PRODUCT_CATALOG_SALES: "conversions",
  OUTCOME_APP_PROMOTION: "app_installs",
  APP_INSTALLS: "app_installs",
  VIDEO_VIEWS: "video_views",
};

const META_STATUS_MAP: Record<string, CampaignStatus> = {
  ACTIVE: "active",
  PAUSED: "paused",
  CAMPAIGN_PAUSED: "paused",
  ARCHIVED: "completed",
  DELETED: "completed",
};

function mapObjective(value: string | undefined): CampaignObjective {
  return (value && META_OBJECTIVE_MAP[value]) || "traffic";
}

function mapStatus(value: string | undefined): CampaignStatus {
  return (value && META_STATUS_MAP[value]) || "draft";
}

export interface MetaCampaignSummary {
  externalId: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  amountSpent: number;
  clicks: number;
  impressions: number;
  reach: number;
  results: number;
}

interface MetaCampaignRaw {
  id: string;
  name: string;
  objective?: string;
  status?: string;
}

interface MetaInsightRaw {
  campaign_id: string;
  spend?: string;
  clicks?: string;
  impressions?: string;
  reach?: string;
  actions?: { action_type: string; value: string }[];
}

export async function listCampaignsWithInsights(adAccountId: string, datePreset: MetaDatePreset = DEFAULT_META_DATE_PRESET): Promise<MetaCampaignSummary[]> {
  const campaignsData = (await metaFetch(`/${adAccountId}/campaigns`, { fields: "id,name,objective,status", limit: "200" })) as {
    data: MetaCampaignRaw[];
  };
  const insightsData = (await metaFetch(`/${adAccountId}/insights`, {
    level: "campaign",
    fields: "campaign_id,spend,clicks,impressions,reach,actions",
    date_preset: datePreset,
    limit: "200",
  })) as { data: MetaInsightRaw[] };

  const insightsByCampaignId = new Map(insightsData.data?.map((i) => [i.campaign_id, i]) ?? []);

  return (campaignsData.data ?? []).map((campaign) => {
    const insight = insightsByCampaignId.get(campaign.id);
    const resultActions = insight?.actions?.reduce((sum, action) => sum + (Number(action.value) || 0), 0) ?? 0;
    return {
      externalId: campaign.id,
      name: campaign.name,
      objective: mapObjective(campaign.objective),
      status: mapStatus(campaign.status),
      amountSpent: Number(insight?.spend) || 0,
      clicks: Number(insight?.clicks) || 0,
      impressions: Number(insight?.impressions) || 0,
      reach: Number(insight?.reach) || 0,
      results: resultActions,
    };
  });
}
