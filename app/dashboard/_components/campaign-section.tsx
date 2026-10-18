"use client";

import {useSyncExternalStore} from "react";
import type {Campaign, CampaignStatus} from "@/lib/types/campaigns";
import type {CampaignSummaryResponse} from "@/lib/api/generated/openAPIDefinition.schemas";
import {useListCampaigns} from "@/lib/api/generated/campaigns/campaigns";
import {EmptyState} from "@/components/dashboard/empty-state";
import {CampaignTable} from "@/components/dashboard/campaign-table";
import {getSessionDrafts, subscribeSessionDrafts} from "@/features/campaigns/shared/session-drafts";
import {getLiveStatus, subscribeLiveStatus} from "@/features/campaigns/shared/live-status";

function toDisplayCampaign(c: CampaignSummaryResponse): Campaign {
  return {
    id: c.id ?? '',
    name: c.name ?? '',
    subject: '',
    status: (c.status as CampaignStatus) ?? 'DRAFT',
    bodyHtml: null,
    retryOfCampaignId: null,
    recipientCount: c.recipientCount ?? null,
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    bouncedCount: 0,
    failedCount: 0,
    sentAt: c.sentAt ?? null,
    createdAt: c.createdAt ?? '',
    filters: [],
    audienceMode: null,
    includedIds: null,
    excludedIds: null,
  };
}

export function CampaignSection() {
  const { data } = useListCampaigns(
    { pageable: { size: 50, sort: ['createdAt,desc'] } },
    { query: { staleTime: 30_000 } },
  );

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

  const serverCampaigns = (data?.content ?? []).map(toDisplayCampaign);
  const serverIds = new Set(serverCampaigns.map((c) => c.id));
  const merged = [
    ...serverCampaigns,
    ...sessionDrafts.filter((c) => !serverIds.has(c.id)),
  ].map((c) => {
    const live = liveStatus.get(c.id);
    if (!live) return c;
    return {
      ...c,
      status: live.event.status,
      recipientCount: live.event.recipientsCount,
      sentCount: live.event.sentCount,
      openedCount: live.event.openedCount,
      deliveredCount: live.event.deliveredCount,
      bouncedCount: live.event.bouncedCount,
      failedCount: live.event.failedCount,
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
