"use client";

import { Suspense, use, useDeferredValue, useState } from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { getCampaignRecipients } from "@/lib/api/campaigns";
import type { Campaign, CampaignRecipient, RecipientStatus } from "@/mocks/fixtures";
import { Spinner } from "@/components/onboarding/spinner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

type TabId = RecipientStatus | "ALL";

const TABS: { id: TabId; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "OPENED", label: "Opened" },
  { id: "FAILED", label: "Failed" },
  { id: "BOUNCED", label: "Bounced" },
];

const STATUS_DISPLAY: Record<
  RecipientStatus,
  { label: string; className: string }
> = {
  QUEUED: { label: "Pending", className: "text-text-dim" },
  SENT: { label: "Sent", className: "text-text-dim" },
  DELIVERED: { label: "Delivered", className: "text-[#8E8E9A]" },
  OPENED: { label: "Opened", className: "text-status-sent" },
  FAILED: { label: "Failed", className: "text-status-failed" },
  BOUNCED: { label: "Bounced", className: "text-status-failed" },
  UNSUBSCRIBED: { label: "Unsubscribed", className: "text-text-dim" },
};

const recipientsPromises = new Map<
  string,
  ReturnType<typeof getCampaignRecipients>
>();

function getRecipientsCached(
  cacheKey: string,
  campaignId: string,
  tab: TabId,
  page: number,
) {
  let promise = recipientsPromises.get(cacheKey);
  if (!promise) {
    promise = getCampaignRecipients(campaignId, {
      status: tab === "ALL" ? undefined : tab,
      page,
      size: PAGE_SIZE,
    });
    recipientsPromises.set(cacheKey, promise);
    // Don't cache a failure — let the next render's use() retry the fetch.
    promise.catch(() => recipientsPromises.delete(cacheKey));
  }
  return promise;
}

interface RecipientTableProps {
  campaignId: string;
  campaign: Campaign;
}

export function RecipientTable({ campaignId, campaign }: Readonly<RecipientTableProps>) {
  const resolving = campaign.status === "RESOLVING";
  const sending = campaign.status === "SENDING";

  const [tab, setTab] = useState<TabId>("ALL");
  const [page, setPage] = useState(0);

  const tabs = sending
    ? [...TABS, { id: "QUEUED" as const, label: "Pending" }]
    : TABS;

  const counts: Record<string, number> = {
    ALL: campaign.recipientCount ?? 0,
    DELIVERED: Math.max(0, campaign.deliveredCount - campaign.openedCount),
    OPENED: campaign.openedCount,
    FAILED: campaign.failedCount,
    BOUNCED: campaign.bouncedCount,
    QUEUED: Math.max(0, (campaign.recipientCount ?? 0) - campaign.sentCount),
  };

  // Deferred so old rows stay visible while new ones load, instead of
  // flashing to the fallback on every poll/SSE update.
  const cacheKey = `${campaignId}-${tab}-${page}-${campaign.sentCount}-${campaign.deliveredCount}-${campaign.openedCount}-${campaign.failedCount}-${campaign.bouncedCount}`;
  const deferredCacheKey = useDeferredValue(cacheKey);
  const stale = deferredCacheKey !== cacheKey;

  function selectTab(id: TabId) {
    setTab(id);
    setPage(0);
  }

  if (resolving) {
    return (
      <div className="bg-white/[0.025] border border-(--color-border) rounded-xl py-11 px-6 flex flex-col items-center gap-2">
        <div className="text-[13.5px] text-[#8E8E9A]">
          Building your recipient list.
        </div>
        <div className="text-[12.5px] text-text-dim text-center text-balance">
          Individual recipients appear here once resolution finishes.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.025] border border-(--color-border) rounded-xl overflow-hidden">
      <div className="flex items-stretch gap-5 px-4.5 border-b border-white/[0.07] overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 py-2.75 font-mono text-[12px] whitespace-nowrap cursor-pointer border-b-2 transition-colors",
              tab === t.id
                ? "text-orange border-orange"
                : "text-text-muted border-transparent hover:text-[#B9B9C2]",
            )}
          >
            {t.label}
            <span className="text-[10.5px] text-text-dim">
              {(counts[t.id] ?? 0).toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(160px,1fr)_116px_132px_60px] gap-3 box-border px-4.5 py-2.25 border-b border-white/[0.07] text-[11px] font-medium tracking-[0.04em] uppercase text-text-dim">
        <div>Email</div>
        <div>Status</div>
        <div>Delivered at</div>
        <div className="text-right">Opened</div>
      </div>

      <div className={cn("transition-opacity", stale && "opacity-60")}>
        <Suspense fallback={<RowsFallback />}>
          <RecipientRows
            cacheKey={deferredCacheKey}
            campaignId={campaignId}
            tab={tab}
            page={page}
            onPageChange={setPage}
          />
        </Suspense>
      </div>
    </div>
  );
}

interface RecipientRowsProps {
  cacheKey: string;
  campaignId: string;
  tab: TabId;
  page: number;
  onPageChange: (page: number) => void;
}

// No remount here — a stable instance reading from the module-level cache
// above is what makes use() safe against re-renders (and Fast Refresh).
function RecipientRows({
  cacheKey,
  campaignId,
  tab,
  page,
  onPageChange,
}: Readonly<RecipientRowsProps>) {
  const { content: rows, totalPages } = use(
    getRecipientsCached(cacheKey, campaignId, tab, page),
  );

  return (
    <>
      {rows.map((r: CampaignRecipient) => {
        const display = STATUS_DISPLAY[r.status];
        return (
          <div
            key={r.id}
            className="grid grid-cols-[minmax(160px,1fr)_116px_132px_60px] gap-3 box-border items-center px-4.5 py-2.5 border-b border-white/[0.045] hover:bg-white/[0.035]"
          >
            <div className="font-mono text-[12.5px] text-[#CBCBD4] whitespace-nowrap overflow-hidden text-ellipsis">
              {r.email}
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 text-[12.5px]",
                display.className,
              )}
            >
              <span className="w-1.25 h-1.25 rounded-full bg-current shrink-0" />
              {display.label}
            </div>
            <div className="font-mono text-[12px] text-[#8E8E9A] tabular-nums">
              {r.deliveredAt
                ? format(new Date(r.deliveredAt), "MMM d HH:mm")
                : "—"}
            </div>
            <div className="flex justify-end">
              {r.status === "OPENED" ? (
                <Check
                  size={14}
                  className="text-status-sent"
                  strokeWidth={2.5}
                />
              ) : (
                <span className="font-mono text-[12px] text-[#4C4C58]">—</span>
              )}
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="py-10 px-4.5 text-center text-[13px] text-text-dim">
          {tab === "ALL"
            ? "No recipients."
            : `No ${STATUS_DISPLAY[tab].label.toLowerCase()} recipients.`}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 py-3 px-4.5 font-mono text-[11.5px] text-text-dim">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
          className={
            page > 0
              ? "text-[#8E8E9A] cursor-pointer"
              : "text-[#3A3A46] cursor-default"
          }
        >
          ← Previous
        </button>
        <span>
          Page {Math.min(page + 1, totalPages)} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          className={
            page + 1 < totalPages
              ? "text-[#8E8E9A] cursor-pointer"
              : "text-[#3A3A46] cursor-default"
          }
        >
          Next →
        </button>
      </div>
    </>
  );
}

function RowsFallback() {
  return (
    <div className="flex items-center justify-center py-10">
      <Spinner size={18} className="border-[#26262F] border-t-orange" />
    </div>
  );
}
