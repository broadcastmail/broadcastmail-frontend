import { getCampaignServerSide, getComposerExtras } from "@/lib/campaigns/get-composer-data";
import { CampaignComposerForm } from "./new/campaign-composer-form";
import { CampaignDetail } from "./detail/campaign-detail";

interface CampaignRouterProps {
  campaignId: string;
}

export async function CampaignRouter({ campaignId }: Readonly<CampaignRouterProps>) {
  const campaign = await getCampaignServerSide(campaignId);

  if (campaign.status !== "DRAFT") {
    return <CampaignDetail campaignId={campaignId} />;
  }

  const data = await getComposerExtras(campaign);
  return (
    <CampaignComposerForm
      campaignId={campaignId}
      campaign={data.campaign}
      audienceColumns={data.audienceColumns}
      resendConfigured={data.resendConfigured}
      initialFilters={data.initialFilters}
      initialRecipientCount={data.initialRecipientCount}
    />
  );
}
