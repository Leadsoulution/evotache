import type { AdCampaign, AdCampaignMetrics } from "@/types/socialMedia";

function ratio(numerator: number, denominator: number, multiplier = 1): number | null {
  return denominator > 0 ? (numerator / denominator) * multiplier : null;
}

export function computeCampaignMetrics(campaign: AdCampaign): AdCampaignMetrics {
  return {
    costPerResult: ratio(campaign.amountSpent, campaign.results),
    ctr: ratio(campaign.clicks, campaign.impressions, 100),
    cpc: ratio(campaign.amountSpent, campaign.clicks),
    cpm: ratio(campaign.amountSpent, campaign.impressions, 1000),
    roas: ratio(campaign.revenue, campaign.amountSpent),
    conversionRate: ratio(campaign.results, campaign.clicks, 100),
  };
}

export function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatRatio(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}
