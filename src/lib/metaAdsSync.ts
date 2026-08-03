import { db } from "@/lib/db";
import { listCampaignsWithInsights } from "@/lib/metaApi";

/** For every AdProject linked to a Meta ad account, pulls its campaigns +
 * lifetime insights and upserts them into AdCampaign (source: "meta"),
 * keyed by [projectId, externalId] so re-running just refreshes existing
 * rows instead of duplicating. Meant to be called only from the cron
 * route — safe to call repeatedly. */
export async function syncMetaAdProjects(): Promise<{ syncedProjects: number; syncedCampaigns: number }> {
  const projects = await db.adProject.findMany({ where: { metaAdAccountId: { not: null } } });
  let syncedCampaigns = 0;

  for (const project of projects) {
    if (!project.metaAdAccountId) continue;
    try {
      const campaigns = await listCampaignsWithInsights(project.metaAdAccountId);
      for (const campaign of campaigns) {
        await db.adCampaign.upsert({
          where: { projectId_externalId: { projectId: project.id, externalId: campaign.externalId } },
          create: {
            projectId: project.id,
            name: campaign.name,
            platform: "facebook",
            objective: campaign.objective,
            status: campaign.status,
            budget: 0,
            amountSpent: campaign.amountSpent,
            results: campaign.results,
            revenue: 0,
            reach: campaign.reach,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            source: "meta",
            externalId: campaign.externalId,
            lastSyncedAt: new Date(),
          },
          update: {
            name: campaign.name,
            objective: campaign.objective,
            status: campaign.status,
            amountSpent: campaign.amountSpent,
            results: campaign.results,
            reach: campaign.reach,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            lastSyncedAt: new Date(),
          },
        });
        syncedCampaigns++;
      }
    } catch (err) {
      // One project's sync failure (e.g. a revoked ad account) shouldn't block the others.
      console.error(`Meta ads sync failed for project ${project.id}:`, err);
    }
  }

  return { syncedProjects: projects.length, syncedCampaigns };
}
