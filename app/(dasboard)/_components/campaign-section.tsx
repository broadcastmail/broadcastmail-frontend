"use client";

import { useSyncExternalStore } from "react";
import { Campaign } from "@/mocks/fixtures";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import {
  getSessionDrafts,
  subscribeSessionDrafts,
} from "@/lib/campaigns/session-drafts";

interface CampaignSectionProps {
  campaigns: Campaign[];
}

export function CampaignSection({ campaigns }: Readonly<CampaignSectionProps>) {
  const sessionDrafts = useSyncExternalStore(
    subscribeSessionDrafts,
    getSessionDrafts,
    getSessionDrafts,
  );
  const serverIds = new Set(campaigns.map((c) => c.id));
  const merged = [
    ...campaigns,
    ...sessionDrafts.filter((c) => !serverIds.has(c.id)),
  ];

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
