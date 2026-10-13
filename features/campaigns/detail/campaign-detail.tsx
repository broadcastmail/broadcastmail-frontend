"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {isAxiosError} from "axios";
import {getCampaign, retryCampaign, retryFailedRecipients,} from "@/features/campaigns/api/campaigns";
import type {Campaign} from "@/lib/types/campaigns";
import {useCampaignStatusStream} from "@/features/campaigns/shared/use-campaign-status-stream";
import {Spinner} from "@/components/onboarding/spinner";
import {wrapEmailShell} from "@/features/campaigns/new/compose/lib/email-html";
import {DetailHeader} from "./detail-header";
import {DetailPreviewPanel} from "./detail-preview-panel";
import {StatCards} from "./stat-cards";
import {DeadEnd} from "./dead-end";
import {RetryStrip} from "./retry-strip";
import {RecipientTable} from "./recipient-table";

interface CampaignDetailProps {
  campaignId: string;
  resendConfigured: boolean;
}

const RETRY_CONFLICT_MSG = "A retry campaign already exists for this campaign.";
const RETRY_GENERIC_MSG = "Couldn't complete the retry. Try again in a moment.";

export function CampaignDetail({ campaignId, resendConfigured }: Readonly<CampaignDetailProps>) {
  const router = useRouter();
  const [baseCampaign, setBaseCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retryConflict, setRetryConflict] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await getCampaign(campaignId);
      setBaseCampaign(c);
      return c;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);


  const liveEvent = useCampaignStatusStream(campaignId, 0);

  const campaign = useMemo(() => {
    if (!baseCampaign) return null;
    if (!liveEvent) return baseCampaign;
    return {
      ...baseCampaign,
      status: liveEvent.status,
      recipientCount: liveEvent.recipientsCount,
      sentCount: liveEvent.sentCount,
      openedCount: liveEvent.openedCount,
      deliveredCount: liveEvent.deliveredCount,
      bouncedCount: liveEvent.bouncedCount,
      failedCount: liveEvent.failedCount,
    };
  }, [baseCampaign, liveEvent]);

  async function handleRetry() {
    if (retrying || !resendConfigured) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const result = await retryCampaign(campaignId);
      router.push(`/dashboard/campaigns/${result.id}`);
    } catch (err) {
      const is409 = isAxiosError(err) && err.response?.status === 409;
      setRetryError(is409 ? RETRY_CONFLICT_MSG : RETRY_GENERIC_MSG);
      if (is409) setRetryConflict(true);
    } finally {
      setRetrying(false);
    }
  }

  async function handleRetryFailed() {
    if (retrying || !resendConfigured) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const result = await retryFailedRecipients(campaignId);
      router.push(`/dashboard/campaigns/${result.id}`);
    } catch (err) {
      const is409 = isAxiosError(err) && err.response?.status === 409;
      setRetryError(is409 ? RETRY_CONFLICT_MSG : RETRY_GENERIC_MSG);
      if (is409) setRetryConflict(true);
    } finally {
      setRetrying(false);
    }
  }

  const previewDoc = useMemo(() => {
    if (!campaign) return "";
    return wrapEmailShell(campaign.bodyHtml ?? "");
  }, [campaign]);

  if (loading || !campaign) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size={20} className="border-[#26262F] border-t-orange" />
      </div>
    );
  }

  const deadEnd = campaign.status === "FAILED";
  const inProgress =
    campaign.status === "RESOLVING" || campaign.status === "SENDING";
  const showRetryStrip =
    !inProgress && !deadEnd && !retryConflict && campaign.failedCount > 0;

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
            retrying={retrying}
            canRetry={!campaign.retryOfCampaignId && !retryConflict}
            errorMessage={retryError}
            resendConfigured={resendConfigured}
          />
        ) : (
          <>
            <StatCards campaign={campaign} />
            {showRetryStrip && (
              <RetryStrip
                failedCount={campaign.failedCount}
                onRetry={handleRetryFailed}
                retrying={retrying}
                errorMessage={retryError}
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
