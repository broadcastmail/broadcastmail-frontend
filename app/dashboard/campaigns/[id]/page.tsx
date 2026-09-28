import { CampaignRouter } from "@/components/campaigns/campaign-router";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignRouter campaignId={id} />;
}
