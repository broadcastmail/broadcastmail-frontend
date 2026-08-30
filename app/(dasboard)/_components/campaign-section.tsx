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

// The initial `campaigns` prop is server-rendered (see dashboard-content.tsx)
// and can't include anything created since — a campaign the "New campaign"
// button creates is POSTed from the browser, which a Server Component's
// fetch can't see (see app/dashboard/campaigns/[id]/page.tsx for the full
// reasoning). Session drafts (this browser tab's own in-memory record of
// what it created — see lib/campaigns/session-drafts.ts) are merged in on
// top so a just-created draft shows up immediately instead of only after a
// refresh happens to re-render the server list.
export function CampaignSection({ campaigns }: CampaignSectionProps) {
  const sessionDrafts = useSyncExternalStore(
    subscribeSessionDrafts,
    getSessionDrafts,
    getSessionDrafts,
  );
  const sessionIds = new Set(sessionDrafts.map((c) => c.id));
  const merged = [
    ...sessionDrafts,
    ...campaigns.filter((c) => !sessionIds.has(c.id)),
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
