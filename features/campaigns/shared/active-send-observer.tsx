"use client";

import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import type {CampaignStatusEvent} from "@/lib/types/campaigns";
import {TERMINAL_CAMPAIGN_STATUSES} from "@/lib/types/campaigns";
import {retryCampaign, retryFailed} from "@/lib/api/generated/campaigns/campaigns";
import type {LiveEntry} from "./live-status";
import {clearLiveStatus, getLiveStatus, setLiveStatus, subscribeLiveStatus} from "./live-status";
import {useRetryAction} from "./use-retry-action";
import {SendProgressToast} from "./send-progress-toast";

export function ActiveSendObserver() {
  const liveStatus = useSyncExternalStore(subscribeLiveStatus, getLiveStatus, () => new Map());
  const { retry, isRetrying, retryError, clearError } = useRetryAction();

  const hasActive = [...liveStatus.values()].some(
    ({ event }) => !TERMINAL_CAMPAIGN_STATUSES.has(event.status),
  );

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasOpenedRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // On mount, open immediately (SSE closes itself if nothing is active).
    // On subsequent runs, close when nothing is active; reopen when something is.
    if (!hasOpenedRef.current) {
      hasOpenedRef.current = true;
    } else if (!hasActive) {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    if (esRef.current) return;

    const es = new EventSource("/api/v1/campaigns/status/stream", { withCredentials: true });
    esRef.current = es;

    es.addEventListener("status", (e: MessageEvent) => {
      const event = JSON.parse(e.data) as CampaignStatusEvent;
      setLiveStatus(event, event.name);
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        setRetryCount((c) => c + 1);
      }, 5000);
    };

    return () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      es.close();
      esRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- retryCount intentionally triggers reconnect
  }, [hasActive, retryCount]);

  function handleRetry(entry: LiveEntry) {
    const { id, status, recipientsCount, failedCount } = entry.event;
    const apiFn = status === "FAILED" ? () => retryCampaign(id) : () => retryFailed(id);
    void retry(id, apiFn, {
      recipientsCount: status === "FAILED" ? recipientsCount : failedCount,
      campaignName: entry.name,
      onSuccess: (oldId) => clearLiveStatus(oldId),
    });
  }

  if (liveStatus.size === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[999999999] flex flex-col gap-3 pointer-events-none">
      {[...liveStatus.values()].map((entry) => (
        <SendProgressToast
          key={entry.event.id}
          entry={entry}
          onDismiss={() => { clearError(entry.event.id); clearLiveStatus(entry.event.id); }}
          onRetry={(entry.event.status === "FAILED" || entry.event.status === "PARTIALLY_FAILED") ? () => handleRetry(entry) : undefined}
          retrying={isRetrying(entry.event.id)}
          retryError={retryError(entry.event.id) ?? undefined}
        />
      ))}
    </div>
  );
}
