import {getCampaign, getComposerData} from "@/features/campaigns/campaign-data";
import {NewCampaignForm} from "./new/new-campaign-form";
import {CampaignDetail} from "./detail/campaign-detail";

interface CampaignRouterProps {
  campaignId: string;
}

export async function CampaignRouter({ campaignId }: Readonly<CampaignRouterProps>) {
  const campaign = await getCampaign(campaignId);

  if (campaign.status !== "DRAFT") {
    return <CampaignDetail campaignId={campaignId} />;
  }

  const composerData = await getComposerData(campaign);
  return (
    <NewCampaignForm
      data={{
        campaign: composerData.campaign,
        audienceColumns: composerData.audienceColumns,
        initialFilters: composerData.campaign.filters,
        initialRecipientCount: composerData.initialAudience.total,
        initialAudience: composerData.initialAudience,
      }}
      resendConfigured={composerData.resendConfigured}
    />
  );
}
