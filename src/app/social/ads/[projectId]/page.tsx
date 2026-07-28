import { AdCampaignsView } from "@/components/socialmedia/ads/AdCampaignsView";

export default async function AdProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AdCampaignsView projectId={projectId} />;
}
