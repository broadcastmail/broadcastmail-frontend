import {useMemo, useSyncExternalStore} from "react";
import type {CampaignStatusEvent} from "@/lib/types/campaigns";
import {TERMINAL_CAMPAIGN_STATUSES} from "@/lib/types/campaigns";

interface CampaignStatusStream {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => CampaignStatusEvent | null;
}


function createCampaignStatusStream(campaignId: string): CampaignStatusStream {
  let snapshot: CampaignStatusEvent | null = null;
  let source: EventSource | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function connect() {
    if (source) return;
    source = new EventSource(
      `/api/v1/campaigns/${campaignId}/status/stream`,
      { withCredentials: true },
    );
    source.addEventListener("status", (event) => {
      snapshot = JSON.parse((event as MessageEvent<string>).data);
      notify();

      if (snapshot && TERMINAL_CAMPAIGN_STATUSES.has(snapshot.status)) {
        source?.close();
        source = null;
      }
    });

    source.onerror = () => {
      source?.close();
      source = null;
    };
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      connect();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          source?.close();
          source = null;
        }
      };
    },
    getSnapshot() {
      return snapshot;
    },
  }
}

const NULL_SNAPSHOT = () => null;


export function useCampaignStatusStream(
  campaignId: string,
  generation: number,
): CampaignStatusEvent | null {
  const stream = useMemo(
    () => createCampaignStatusStream(campaignId),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generation is a deliberate extra dep to force a reconnect, not something createCampaignStatusStream reads
    [campaignId, generation],
  );
  return useSyncExternalStore(
    stream.subscribe,
    stream.getSnapshot,
    NULL_SNAPSHOT,
  );
}
