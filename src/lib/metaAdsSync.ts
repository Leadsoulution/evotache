import { db } from "@/lib/db";
import { listCampaignsWithInsights } from "@/lib/metaApi";
import { DEFAULT_META_DATE_PRESET } from "@/config/metaAds";
import type { MetaDateRangeParam } from "@/config/metaAds";
import type { AdProject, Prisma } from "@/generated/prisma/client";

/** Pulls one project's linked ad account's campaigns + insights for the
 * given date range and upserts them into AdCampaign (source: "meta"),
 * keyed by [projectId, externalId] so re-running just refreshes existing
 * rows instead of duplicating. */
export async function syncProject(project: AdProject, dateRange: MetaDateRangeParam = DEFAULT_META_DATE_PRESET): Promise<number> {
  if (!project.metaAdAccountId) return 0;
  const campaigns = await listCampaignsWithInsights(project.metaAdAccountId, dateRange);
  // listCampaignsWithInsights only returns campaigns that delivered during
  // dateRange, so a narrower range than the previous sync (e.g. switching
  // from "All time" to "Last month") must also drop the now-stale rows a
  // wider sync left behind — otherwise they'd keep showing forever.
  await db.adCampaign.deleteMany({
    where: {
      projectId: project.id,
      source: "meta",
      externalId: { notIn: campaigns.map((c) => c.externalId) },
    },
  });
  for (const campaign of campaigns) {
    await db.adCampaign.upsert({
      where: { projectId_externalId: { projectId: project.id, externalId: campaign.externalId } },
      create: {
        projectId: project.id,
        name: campaign.name,
        platform: "facebook",
        objective: campaign.objective,
        status: campaign.status,
        budget: campaign.dailyBudget ?? 0,
        amountSpent: campaign.amountSpent,
        results: campaign.results,
        revenue: 0,
        reach: campaign.reach,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        source: "meta",
        externalId: campaign.externalId,
        lastSyncedAt: new Date(),
        metaInsights: campaign.insights as unknown as Prisma.InputJsonValue,
      },
      update: {
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        budget: campaign.dailyBudget ?? 0,
        amountSpent: campaign.amountSpent,
        results: campaign.results,
        reach: campaign.reach,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        lastSyncedAt: new Date(),
        metaInsights: campaign.insights as unknown as Prisma.InputJsonValue,
      },
    });
  }
  return campaigns.length;
}

/** For every AdProject linked to a Meta ad account, syncs its campaigns
 * (all-time). Meant to be called only from the cron route — safe to call
 * repeatedly. */
export async function syncMetaAdProjects(): Promise<{ syncedProjects: number; syncedCampaigns: number; errors: { projectId: string; projectName: string; message: string }[] }> {
  const projects = await db.adProject.findMany({ where: { metaAdAccountId: { not: null } } });
  let syncedCampaigns = 0;
  const errors: { projectId: string; projectName: string; message: string }[] = [];

  for (const project of projects) {
    try {
      syncedCampaigns += await syncProject(project);
    } catch (err) {
      // One project's sync failure (e.g. a revoked ad account) shouldn't block the others —
      // but the failure is still reported back so it doesn't look identical to "no campaigns".
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Meta ads sync failed for project ${project.id}:`, err);
      errors.push({ projectId: project.id, projectName: project.name, message });
    }
  }

  return { syncedProjects: projects.length, syncedCampaigns, errors };
}
