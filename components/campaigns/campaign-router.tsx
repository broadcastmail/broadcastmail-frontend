"use client";

import { Suspense, use } from "react";
import { getCampaign } from "@/lib/api/campaigns";
import type { Campaign } from "@/mocks/fixtures";
import { Spinner } from "@/components/onboarding/spinner";
import { NewCampaignComposer } from "./new/new-campaign-composer";
import { CampaignDetail } from "./detail/campaign-detail";

interface CampaignRouterProps {
  campaignId: string;
}

const campaignPromises = new Map<string, Promise<Campaign>>();

function getCampaignCached(campaignId: string): Promise<Campaign> {
  let promise = campaignPromises.get(campaignId);
  if (!promise) {
    promise = getCampaign(campaignId);
    campaignPromises.set(campaignId, promise);
    promise.catch(() => campaignPromises.delete(campaignId));
  }
  return promise;
}

export function CampaignRouter({ campaignId }: Readonly<CampaignRouterProps>) {
  return (
    <Suspense fallback={<RouterFallback />}>
      <CampaignRouterResolved campaignId={campaignId} />
    </Suspense>
  );
}

function CampaignRouterResolved({ campaignId }: CampaignRouterProps) {
  const campaign = use(getCampaignCached(campaignId));

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
