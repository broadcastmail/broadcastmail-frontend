"use client";

import {useEffect, useSyncExternalStore} from "react";
import type {CampaignStatusEvent} from "@/lib/types/campaigns";
import {Campaign} from "@/lib/types/campaigns";
import {EmptyState} from "@/components/dashboard/empty-state";
import {CampaignTable} from "@/components/dashboard/campaign-table";
import {getSessionDrafts, subscribeSessionDrafts,} from "@/features/campaigns/shared/session-drafts";
import {getLiveStatus, setLiveStatus, subscribeLiveStatus,} from "@/features/campaigns/shared/live-status";

interface CampaignSectionProps {
  campaigns: Campaign[];
}

// The backend closes this stream (a clean close, not an error) whenever
// nothing is currently RESOLVING/SENDING — the common case. Retry on a
// slow interval rather than letting EventSource's default "reconnect
// immediately" hammer an endpoint that's going to close right back.
const RECONNECT_MS = 15000;

export function CampaignSection({ campaigns }: Readonly<CampaignSectionProps>) {
  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (cancelled) return;
      source = new EventSource("/api/v1/campaigns/status/stream", {
        withCredentials: true,
      });
      source.addEventListener("status", (event) => {
        const data: CampaignStatusEvent = JSON.parse(
          (event as MessageEvent<string>).data,
        );
        setLiveStatus(data);
      });
      source.onerror = () => {
        source?.close();
        if (!cancelled) retryTimeout = setTimeout(connect, RECONNECT_MS);
      };
    }
    connect();

    return () => {
      cancelled = true;
      source?.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  const liveStatus = useSyncExternalStore(
    subscribeLiveStatus,
    getLiveStatus,
    getLiveStatus,
  );
  const sessionDrafts = useSyncExternalStore(
    subscribeSessionDrafts,
    getSessionDrafts,
    getSessionDrafts,
  );
  const serverIds = new Set(campaigns.map((c) => c.id));
  const merged = [
    ...campaigns,
    ...sessionDrafts.filter((c) => !serverIds.has(c.id)),
  ].map((c) => {
    const live = liveStatus.get(c.id);
    if (!live) return c;
    return {
      ...c,
      status: live.status,
      recipientCount: live.recipientsCount,
      sentCount: live.sentCount,
      openedCount: live.openedCount,
      deliveredCount: live.deliveredCount,
      bouncedCount: live.bouncedCount,
      failedCount: live.failedCount,
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold text-text-primary">
          Recent
        </div>
        <div className="font-mono text-[11.5px] text-text-dim">
          {merged.length} campaign{merged.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="bg-[rgba(255,255,255,0.025)] border border-(--color-border) rounded-xl overflow-hidden">
        {merged.length === 0 ? (
          <EmptyState />
        ) : (
          <CampaignTable campaigns={merged} />
        )}
      </div>
    </div>
  );
}
