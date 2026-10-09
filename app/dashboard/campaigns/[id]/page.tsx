import {CampaignRouter} from "@/features/campaigns/campaign-router";

export default async function CampaignPage({
  params,
}: Readonly<{
    params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  return <div className="h-full min-h-0 overflow-hidden"><CampaignRouter campaignId={id} /></div>;
}
