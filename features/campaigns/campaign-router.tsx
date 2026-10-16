import {getCampaign, getComposerData} from "@/features/campaigns/campaign-data";
import {getAccountEmailProvider} from "@/lib/api/account";
import {NewCampaignForm} from "./new/new-campaign-form";
import {CampaignDetail} from "./detail/campaign-detail";

interface CampaignRouterProps {
  campaignId: string;
}

export async function CampaignRouter({ campaignId }: Readonly<CampaignRouterProps>) {
  const campaign = await getCampaign(campaignId);

  if (campaign.status !== "DRAFT") {
    const emailProvider = await getAccountEmailProvider();
    return <CampaignDetail initialCampaign={campaign} resendConfigured={!!emailProvider?.fromAddress} />;
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
