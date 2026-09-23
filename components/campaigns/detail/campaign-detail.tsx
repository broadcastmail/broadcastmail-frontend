"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCampaign,
  retryCampaign,
  retryFailedRecipients,
} from "@/lib/api/campaigns";
import { getAccountEmailProvider } from "@/lib/api/email-provider";
import type { Campaign } from "@/mocks/fixtures";
import { Spinner } from "@/components/onboarding/spinner";
import { jsonToHtml } from "@/lib/campaigns/editor-extensions";
import { wrapEmailShell } from "@/lib/campaigns/email-html";
import { sanitizeHtmlSource } from "@/lib/campaigns/sanitize-html-source";
import { DetailHeader } from "./detail-header";
import { DetailPreviewPanel } from "./detail-preview-panel";
import { StatCards } from "./stat-cards";
import { DeadEnd } from "./dead-end";
import { RetryStrip } from "./retry-strip";
import { RecipientTable } from "./recipient-table";

interface CampaignDetailProps {
  campaignId: string;
}

export function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const [resendConfigured, setResendConfigured] = useState(false);

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
      setCampaign(c);
      return c;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const c = await load();
        if (cancelled) return;
        if (c.status === "RESOLVING" || c.status === "SENDING") {
          timeoutId = setTimeout(tick, 1500);
        }
      } catch {
        if (!cancelled) timeoutId = setTimeout(tick, 1500);
      }
    }
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [load]);

  async function handleRetry() {
    if (retrying || !resendConfigured) return;
    setRetrying(true);
    setRetryError(false);
    try {
      await retryCampaign(campaignId);
      await load();
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
