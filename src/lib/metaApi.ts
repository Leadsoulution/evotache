import { getValidAccessToken } from "@/lib/metaAuth";
import { DEFAULT_META_DATE_PRESET, isCustomDateRange } from "@/config/metaAds";
import type { MetaDateRangeParam } from "@/config/metaAds";
import type { CampaignObjective, CampaignStatus, MetaCampaignInsights } from "@/types/socialMedia";

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

// Meta's "Results" column in Ads Manager isn't a single API field — it's
// whichever action_type matches the campaign's optimization_goal. Naively
// summing every action type (the previous approach) mixes unrelated counts
// together and is why results looked wrong/zero. This maps the common
// goals to their real action_type(s), checked in order; REACH/IMPRESSIONS
// goals use those metrics directly instead of an action.
const OPTIMIZATION_GOAL_ACTIONS: Record<string, string[]> = {
  OFFSITE_CONVERSIONS: ["offsite_conversion.fb_pixel_purchase", "purchase", "offsite_conversion.fb_pixel_custom"],
  VALUE: ["offsite_conversion.fb_pixel_purchase", "purchase"],
  LINK_CLICKS: ["link_click"],
  LANDING_PAGE_VIEWS: ["landing_page_view"],
  POST_ENGAGEMENT: ["post_engagement"],
  PAGE_LIKES: ["like"],
  LEAD_GENERATION: ["lead", "onsite_conversion.lead_grouped"],
  QUALITY_LEAD: ["onsite_conversion.lead_grouped", "lead"],
  THRUPLAY: ["video_thruplay_watched"],
  APP_INSTALLS: ["mobile_app_install", "omni_app_install"],
  CONVERSATIONS: ["onsite_conversion.messaging_conversation_started_7d"],
  MESSAGING_PURCHASE_CONVERSION: ["onsite_conversion.messaging_first_reply"],
  VISIT_INSTAGRAM_PROFILE: ["onsite_conversion.total_messaging_connection"],
};

export interface MetaCampaignSummary {
  externalId: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  dailyBudget: number | null;
  amountSpent: number;
  clicks: number;
  impressions: number;
  reach: number;
  results: number;
  insights: MetaCampaignInsights;
}

interface MetaCampaignRaw {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  effective_status?: string;
  optimization_goal?: string;
  daily_budget?: string;
}

interface MetaActionValue {
  action_type: string;
  value: string;
}

interface MetaInsightRaw {
  campaign_id: string;
  spend?: string;
  clicks?: string;
  impressions?: string;
  reach?: string;
  actions?: MetaActionValue[];
  cpc?: string;
  cpm?: string;
  ctr?: string;
  frequency?: string;
  outbound_clicks?: MetaActionValue[];
  outbound_clicks_ctr?: MetaActionValue[];
  cost_per_outbound_click?: MetaActionValue[];
}

function actionValue(actions: MetaActionValue[] | undefined, actionType: string): number | null {
  const match = actions?.find((a) => a.action_type === actionType);
  return match ? Number(match.value) || 0 : null;
}

// If no optimization_goal is known at all (still possible even after the ad
// set lookup below), check these conversion-oriented action types in
// priority order — NEVER fall back to "the largest action count", since
// that picks broad engagement/reach metrics (page_engagement, video_view...)
// which are almost never what "Results" actually means.
const SAFE_FALLBACK_ACTIONS = [
  "offsite_conversion.fb_pixel_purchase",
  "purchase",
  "omni_purchase",
  "onsite_conversion.lead_grouped",
  "lead",
  "link_click",
  "landing_page_view",
];

function extractResults(insight: MetaInsightRaw | undefined, optimizationGoal: string | undefined, reach: number, impressions: number): number {
  if (optimizationGoal === "REACH") return reach;
  if (optimizationGoal === "IMPRESSIONS") return impressions;
  const candidates = optimizationGoal ? OPTIMIZATION_GOAL_ACTIONS[optimizationGoal] : undefined;
  if (candidates) {
    for (const actionType of candidates) {
      const value = actionValue(insight?.actions, actionType);
      if (value !== null) return value;
    }
    return 0; // goal is mapped, that action just didn't happen this period — genuinely 0.
  }
  for (const actionType of SAFE_FALLBACK_ACTIONS) {
    const value = actionValue(insight?.actions, actionType);
    if (value !== null) return value;
  }
  return 0;
}

/** optimization_goal and daily_budget often only live on the ad sets, not
 * the campaign itself — non-CBO campaigns (budget set per ad set rather
 * than "Advantage campaign budget") leave both fields empty at the
 * campaign level. One batched call for the whole account covers every
 * campaign instead of one extra call per campaign missing it. Budgets are
 * summed across a campaign's ad sets — the campaign's real daily spend
 * cap is the sum of what each of its ad sets can spend per day. */
async function getAdSetDetails(adAccountId: string): Promise<{ goals: Map<string, string>; budgets: Map<string, number> }> {
  const data = (await metaFetch(`/${adAccountId}/adsets`, { fields: "campaign_id,optimization_goal,daily_budget", limit: "500" })) as {
    data: { campaign_id: string; optimization_goal?: string; daily_budget?: string }[];
  };
  const goals = new Map<string, string>();
  const budgets = new Map<string, number>();
  for (const adSet of data.data ?? []) {
    if (adSet.optimization_goal && !goals.has(adSet.campaign_id)) goals.set(adSet.campaign_id, adSet.optimization_goal);
    if (adSet.daily_budget) {
      // Meta returns budgets in the account currency's minor unit (e.g. cents).
      budgets.set(adSet.campaign_id, (budgets.get(adSet.campaign_id) ?? 0) + Number(adSet.daily_budget) / 100);
    }
  }
  return { goals, budgets };
}

export async function listCampaignsWithInsights(adAccountId: string, dateRange: MetaDateRangeParam = DEFAULT_META_DATE_PRESET): Promise<MetaCampaignSummary[]> {
  const campaignsData = (await metaFetch(`/${adAccountId}/campaigns`, {
    fields: "id,name,objective,status,effective_status,optimization_goal,daily_budget",
    limit: "200",
  })) as { data: MetaCampaignRaw[] };
  const dateParams: Record<string, string> = isCustomDateRange(dateRange) ? { time_range: JSON.stringify(dateRange) } : { date_preset: dateRange };
  const insightsData = (await metaFetch(`/${adAccountId}/insights`, {
    level: "campaign",
    fields:
      "campaign_id,spend,clicks,impressions,reach,actions,cpc,cpm,ctr,frequency,outbound_clicks,outbound_clicks_ctr,cost_per_outbound_click",
    ...dateParams,
    limit: "200",
  })) as { data: MetaInsightRaw[] };

  const insightsByCampaignId = new Map(insightsData.data?.map((i) => [i.campaign_id, i]) ?? []);
  const needsAdSetDetails = (campaignsData.data ?? []).some((c) => !c.optimization_goal || !c.daily_budget);
  const adSetDetails = needsAdSetDetails ? await getAdSetDetails(adAccountId) : { goals: new Map<string, string>(), budgets: new Map<string, number>() };

  return (campaignsData.data ?? []).map((campaign) => {
    const insight = insightsByCampaignId.get(campaign.id);
    const impressions = Number(insight?.impressions) || 0;
    const reach = Number(insight?.reach) || 0;
    const optimizationGoal = campaign.optimization_goal ?? adSetDetails.goals.get(campaign.id);
    // Falls back to the sum of the campaign's ad-set-level budgets when
    // there's no campaign-level ("Advantage campaign budget") one — null
    // (not 0) if neither is set, so the UI can show "—" instead of a
    // misleading "$0.00" for a campaign that does have a real budget,
    // just not one this app can see at the campaign level.
    const dailyBudget = campaign.daily_budget !== undefined ? Number(campaign.daily_budget) / 100 : (adSetDetails.budgets.get(campaign.id) ?? null);
    return {
      externalId: campaign.id,
      name: campaign.name,
      objective: mapObjective(campaign.objective),
      status: mapStatus(campaign.status),
      dailyBudget,
      amountSpent: Number(insight?.spend) || 0,
      clicks: Number(insight?.clicks) || 0,
      impressions,
      reach,
      results: extractResults(insight, optimizationGoal, reach, impressions),
      insights: {
        deliveryStatus: campaign.effective_status ?? null,
        dailyBudget,
        cpc: insight?.cpc !== undefined ? Number(insight.cpc) : null,
        cpm: insight?.cpm !== undefined ? Number(insight.cpm) : null,
        ctr: insight?.ctr !== undefined ? Number(insight.ctr) : null,
        frequency: insight?.frequency !== undefined ? Number(insight.frequency) : null,
        linkClicks: actionValue(insight?.outbound_clicks, "outbound_click"),
        linkClicksCtr: actionValue(insight?.outbound_clicks_ctr, "outbound_click"),
        costPerLinkClick: actionValue(insight?.cost_per_outbound_click, "outbound_click"),
      },
    };
  });
}
