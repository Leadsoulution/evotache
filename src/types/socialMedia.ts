export type AdPlatform = "facebook" | "instagram" | "tiktok" | "google" | "linkedin" | "other";

export type AdProjectStatus = "active" | "paused" | "completed";

export interface AdProject {
  id: string;
  name: string;
  client: string;
  platform: AdPlatform;
  status: AdProjectStatus;
  archived: boolean;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
  /** Meta ad account id ("act_...") this project auto-syncs campaigns from, if linked. */
  metaAdAccountId: string | null;
  createdAt: string;
}

export type CampaignObjective = "awareness" | "traffic" | "engagement" | "leads" | "conversions" | "app_installs" | "video_views";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface AdCampaign {
  id: string;
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
  /** "manual" (entered by hand) or "meta" (auto-synced — read-only, overwritten on each sync). */
  source: "manual" | "meta";
  externalId: string | null;
  lastSyncedAt: string | null;
  /** Extra Meta-reported KPIs beyond this app's own fixed fields (cpc, cpm, ctr, link clicks, delivery status, ...) — only set for source="meta" rows. */
  metaInsights: MetaCampaignInsights | null;
  createdAt: string;
}

export interface MetaCampaignInsights {
  deliveryStatus: string | null;
  cpc: number | null;
  cpm: number | null;
  ctr: number | null;
  frequency: number | null;
  linkClicks: number | null;
  linkClicksCtr: number | null;
  costPerLinkClick: number | null;
}

/** Ratios derived from an AdCampaign's raw counters — never stored, always recomputed so they can't drift out of sync. */
export interface AdCampaignMetrics {
  costPerResult: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  roas: number | null;
  conversionRate: number | null;
}

export type ContentPriority = "low" | "normal" | "high" | "urgent";

export type ReelEditingStatus = "not_started" | "in_progress" | "review" | "done";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Reel {
  id: string;
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
  order: number;
  createdAt: string;
}

/** Shared production pipeline for Posts and Stories. */
export type ContentStageStatus = "draft" | "design" | "review" | "approved" | "scheduled" | "published";

export interface Post {
  id: string;
  title: string;
  client: string;
  assigneeId: string | null;
  status: ContentStageStatus;
  priority: ContentPriority;
  publishingDate: string | null;
  notes: string;
  link: string | null;
  order: number;
  createdAt: string;
}

export interface Story {
  id: string;
  title: string;
  client: string;
  platform: AdPlatform;
  dueDate: string | null;
  status: ContentStageStatus;
  assigneeId: string | null;
  notes: string;
  link: string | null;
  order: number;
  createdAt: string;
}
