import type {
  AdPlatform,
  AdProjectStatus,
  ApprovalStatus,
  CampaignObjective,
  CampaignStatus,
  ContentPriority,
  ContentStageStatus,
  ReelEditingStatus,
} from "@/types/socialMedia";

interface MetaEntry {
  label: string;
  color: string;
}

export const PLATFORM_META: Record<AdPlatform, MetaEntry> = {
  facebook: { label: "Facebook", color: "#1877f2" },
  instagram: { label: "Instagram", color: "#e1306c" },
  tiktok: { label: "TikTok", color: "#25f4ee" },
  google: { label: "Google Ads", color: "#f59e0b" },
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  other: { label: "Other", color: "#64748b" },
};

export const PLATFORM_ORDER: AdPlatform[] = ["facebook", "instagram", "tiktok", "google", "linkedin", "other"];

export const AD_PROJECT_STATUS_META: Record<AdProjectStatus, MetaEntry> = {
  active: { label: "Active", color: "#22c55e" },
  paused: { label: "Paused", color: "#f59e0b" },
  completed: { label: "Completed", color: "#6366f1" },
};

export const AD_PROJECT_STATUS_ORDER: AdProjectStatus[] = ["active", "paused", "completed"];

export const CAMPAIGN_OBJECTIVE_META: Record<CampaignObjective, MetaEntry> = {
  awareness: { label: "Awareness", color: "#a855f7" },
  traffic: { label: "Traffic", color: "#06b6d4" },
  engagement: { label: "Engagement", color: "#ec4899" },
  leads: { label: "Leads", color: "#f59e0b" },
  conversions: { label: "Conversions", color: "#22c55e" },
  app_installs: { label: "App installs", color: "#6366f1" },
  video_views: { label: "Video views", color: "#ef4444" },
};

export const CAMPAIGN_OBJECTIVE_ORDER: CampaignObjective[] = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "conversions",
  "app_installs",
  "video_views",
];

export const CAMPAIGN_STATUS_META: Record<CampaignStatus, MetaEntry> = {
  draft: { label: "Draft", color: "#94a3b8" },
  active: { label: "Active", color: "#22c55e" },
  paused: { label: "Paused", color: "#f59e0b" },
  completed: { label: "Completed", color: "#6366f1" },
};

export const CAMPAIGN_STATUS_ORDER: CampaignStatus[] = ["draft", "active", "paused", "completed"];

export const CONTENT_PRIORITY_META: Record<ContentPriority, MetaEntry> = {
  low: { label: "Low", color: "#64748b" },
  normal: { label: "Normal", color: "#6366f1" },
  high: { label: "High", color: "#f59e0b" },
  urgent: { label: "Urgent", color: "#ef4444" },
};

export const CONTENT_PRIORITY_ORDER: ContentPriority[] = ["low", "normal", "high", "urgent"];

export const REEL_EDITING_STATUS_META: Record<ReelEditingStatus, MetaEntry> = {
  not_started: { label: "Not started", color: "#94a3b8" },
  in_progress: { label: "Editing", color: "#6366f1" },
  review: { label: "Review", color: "#f59e0b" },
  done: { label: "Done", color: "#22c55e" },
};

export const REEL_EDITING_STATUS_ORDER: ReelEditingStatus[] = ["not_started", "in_progress", "review", "done"];

export const APPROVAL_STATUS_META: Record<ApprovalStatus, MetaEntry> = {
  pending: { label: "Pending", color: "#f59e0b" },
  approved: { label: "Approved", color: "#22c55e" },
  rejected: { label: "Rejected", color: "#ef4444" },
};

export const CONTENT_STAGE_STATUS_META: Record<ContentStageStatus, MetaEntry> = {
  draft: { label: "Draft", color: "#94a3b8" },
  design: { label: "Design", color: "#a855f7" },
  review: { label: "Review", color: "#f59e0b" },
  approved: { label: "Approved", color: "#06b6d4" },
  scheduled: { label: "Scheduled", color: "#6366f1" },
  published: { label: "Published", color: "#22c55e" },
};

export const CONTENT_STAGE_STATUS_ORDER: ContentStageStatus[] = ["draft", "design", "review", "approved", "scheduled", "published"];
