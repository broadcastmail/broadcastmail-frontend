import type {CampaignStatusEvent} from "@/lib/types/campaigns";

export interface LiveEntry {
  event: CampaignStatusEvent;
  name: string;
}

let liveStatus = new Map<string, LiveEntry>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setLiveStatus(event: CampaignStatusEvent, name: string) {
  liveStatus = new Map(liveStatus).set(event.id, { event, name });
  notify();
}

export function clearLiveStatus(id: string) {
  if (!liveStatus.has(id)) return;
  liveStatus = new Map(liveStatus);
  liveStatus.delete(id);
  notify();
}

export function getLiveStatus(): Map<string, LiveEntry> {
  return liveStatus;
}

export function subscribeLiveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
