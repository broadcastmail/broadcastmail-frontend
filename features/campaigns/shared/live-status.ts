import type {CampaignStatusEvent} from "@/lib/types/campaigns";

let liveStatus = new Map<string, CampaignStatusEvent>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setLiveStatus(event: CampaignStatusEvent) {
  liveStatus = new Map(liveStatus).set(event.id, event);
  notify();
}

export function getLiveStatus(): Map<string, CampaignStatusEvent> {
  return liveStatus;
}

export function subscribeLiveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
