"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {getCampaign, retryCampaign, retryFailedRecipients,} from "@/features/campaigns/api/campaigns";
import {getAccountEmailProvider} from "@/lib/api/email-provider";
import type {Campaign} from "@/lib/types/campaigns";
import {useCampaignStatusStream} from "@/features/campaigns/shared/use-campaign-status-stream";
import {Spinner} from "@/components/onboarding/spinner";
import {jsonToHtml} from "@/features/campaigns/new/compose/lib/editor-extensions";
import {wrapEmailShell} from "@/features/campaigns/new/compose/lib/email-html";
import {sanitizeHtmlSource} from "@/features/campaigns/new/compose/lib/sanitize-html-source";
import {DetailHeader} from "./detail-header";
import {DetailPreviewPanel} from "./detail-preview-panel";
import {StatCards} from "./stat-cards";
import {DeadEnd} from "./dead-end";
import {RetryStrip} from "./retry-strip";
import {RecipientTable} from "./recipient-table";

interface CampaignDetailProps {
  campaignId: string;
}

export function CampaignDetail({ campaignId }: Readonly<CampaignDetailProps>) {
  const [baseCampaign, setBaseCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const [resendConfigured, setResendConfigured] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAccountEmailProvider().then((provider) => {
      if (!cancelled) setResendConfigured(!!provider?.fromAddress);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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


  const liveEvent = useCampaignStatusStream(campaignId, reconnectKey);

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
    setRetryError(false);
    try {
      await retryCampaign(campaignId);
      await load();
      setReconnectKey((k) => k + 1);
    } catch {
      setRetryError(true);
    } finally {
      setRetrying(false);
    }
  }

  async function handleRetryFailed() {
    if (retrying || !resendConfigured) return;
    setRetrying(true);
    setRetryError(false);
    try {
      await retryFailedRecipients(campaignId);
      await load();
      setReconnectKey((k) => k + 1);
    } catch {
      setRetryError(true);
    } finally {
      setRetrying(false);
    }
  }

  const previewDoc = useMemo(() => {
    if (!campaign) return "";
    const bodyHtml =
      campaign.source === "visual"
        ? jsonToHtml(campaign.bodyJson ?? { type: "doc", content: [] })
        : sanitizeHtmlSource(campaign.bodyHtmlImported ?? "");
    return wrapEmailShell(bodyHtml);
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
  const showRetryStrip = !inProgress && !deadEnd && campaign.failedCount > 0;

  return (
    <div className="flex-1 overflow-y-auto px-8 py-9 flex justify-center">
      <div className="w-full max-w-280 shrink-0 flex flex-col gap-6">
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
            error={retryError}
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
                error={retryError}
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
