"use client";

import { Suspense, use, useMemo } from "react";
import { getCampaign } from "@/lib/api/campaigns";
import { Spinner } from "@/components/onboarding/spinner";
import { NewCampaignComposer } from "./new/new-campaign-composer";
import { CampaignDetail } from "./detail/campaign-detail";

interface CampaignRouterProps {
  campaignId: string;
}

export function CampaignRouter({ campaignId }: CampaignRouterProps) {
  return (
    <Suspense fallback={<RouterFallback />}>
      <CampaignRouterResolved campaignId={campaignId} />
    </Suspense>
  );
}

function CampaignRouterResolved({ campaignId }: CampaignRouterProps) {
  const campaignPromise = useMemo(() => getCampaign(campaignId), [campaignId]);
  const campaign = use(campaignPromise);

  return campaign.status === "DRAFT" ? (
    <NewCampaignComposer campaignId={campaignId} />
  ) : (
    <CampaignDetail campaignId={campaignId} />
  );
}

function RouterFallback() {
  return (
    <div className="flex flex-col h-full min-h-0 items-center justify-center">
      <Spinner size={20} className="border-[#26262F] border-t-orange" />
    </div>
  );
}
