"use client";

import {useMemo, useState} from "react";
import type {Campaign, CampaignStatusEvent} from "@/lib/types/campaigns";
import {retryCampaign, retryFailed, useGetCampaign} from "@/lib/api/generated/campaigns/campaigns";
import type {CampaignResponse} from "@/lib/api/generated/openAPIDefinition.schemas";
import {useCampaignStatusStream} from "@/features/campaigns/shared/use-campaign-status-stream";
import {useRetryAction} from "@/features/campaigns/shared/use-retry-action";
import {wrapEmailShell} from "@/features/campaigns/new/compose/lib/email-html";
import {DetailHeader} from "./detail-header";
import {DetailPreviewPanel} from "./detail-preview-panel";
import {StatCards} from "./stat-cards";
import {DeadEnd} from "./dead-end";
import {RetryStrip} from "./retry-strip";
import {RecipientTable} from "./recipient-table";

function applyLiveEvent(base: Campaign, event: CampaignStatusEvent): Campaign {
  return {
    ...base,
    status: event.status,
    recipientCount: event.recipientsCount,
    sentCount: event.sentCount,
    openedCount: event.openedCount,
    deliveredCount: event.deliveredCount,
    bouncedCount: event.bouncedCount,
    failedCount: event.failedCount,
  };
}

interface CampaignDetailProps {
  initialCampaign: Campaign;
  resendConfigured: boolean;
}

export function CampaignDetail({ initialCampaign, resendConfigured }: Readonly<CampaignDetailProps>) {
  const campaignId = initialCampaign.id;

  const { data: baseCampaign = initialCampaign } = useGetCampaign(campaignId, {
    query: {
      staleTime: 10_000,
      initialData: initialCampaign as unknown as CampaignResponse,
      select: (data): Campaign => ({
        id: data.id,
        name: data.name,
        subject: data.subject,
        status: data.status as Campaign["status"],
        bodyHtml: data.bodyHtml ?? null,
        retryOfCampaignId: data.retryOfCampaignId ?? null,
        recipientCount: data.recipientCount ?? null,
        sentCount: data.sentCount,
        deliveredCount: data.deliveredCount,
        openedCount: data.openedCount,
        bouncedCount: data.bouncedCount,
        failedCount: data.failedCount,
        scheduledAt: data.scheduledAt ?? null,
        sentAt: data.sentAt ?? null,
        createdAt: data.createdAt,
        filters: data.filters as Campaign["filters"],
        audienceMode: data.audienceMode as unknown as Campaign["audienceMode"],
        includedIds: data.includedIds ?? null,
        excludedIds: data.excludedIds ?? null,
      }),
    },
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const { retry, isRetrying, retryError, isConflict } = useRetryAction();

  const liveEvent = useCampaignStatusStream(campaignId, 0);

  const campaign = useMemo(
    () => liveEvent ? applyLiveEvent(baseCampaign, liveEvent) : baseCampaign,
    [baseCampaign, liveEvent],
  );

  const handleRetry = () => {
    if (!resendConfigured) return;
    void retry(campaignId, () => retryCampaign(campaignId), { recipientsCount: campaign.recipientCount ?? null, campaignName: campaign.name ?? "" });
  };

  const handleRetryFailed = () => {
    if (!resendConfigured) return;
    void retry(campaignId, () => retryFailed(campaignId), { recipientsCount: campaign.failedCount ?? null, campaignName: campaign.name ?? "" });
  };

  const previewDoc = useMemo(() => wrapEmailShell(campaign.bodyHtml ?? ""), [campaign]);

  const deadEnd = campaign.status === "FAILED";
  const inProgress =
    campaign.status === "RESOLVING" || campaign.status === "SENDING";
  const showRetryStrip = !inProgress && !deadEnd && campaign.failedCount > 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bm-scrollbar px-8 py-9">
      <div className="w-full max-w-280 mx-auto flex flex-col gap-6">
        <DetailHeader
          campaign={campaign}
          previewOpen={previewOpen}
          onTogglePreview={() => setPreviewOpen((v) => !v)}
        />

        {previewOpen && (
          <DetailPreviewPanel
            previewDoc={previewDoc}
            subject={campaign.subject}
          />
        )}

        {deadEnd ? (
          <DeadEnd
            onRetry={handleRetry}
            retrying={isRetrying(campaignId)}
            canRetry={!isConflict(campaignId)}
            errorMessage={retryError(campaignId)}
            resendConfigured={resendConfigured}
          />
        ) : (
          <>
            <StatCards campaign={campaign} />
            {showRetryStrip && (
              <RetryStrip
                failedCount={campaign.failedCount}
                onRetry={handleRetryFailed}
                retrying={isRetrying(campaignId)}
                canRetry={!isConflict(campaignId)}
                errorMessage={retryError(campaignId)}
                resendConfigured={resendConfigured}
              />
            )}
            <RecipientTable campaignId={campaignId} campaign={campaign} />
          </>
        )}
      </div>
    </div>
  );
}
